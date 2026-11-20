import type { ArchiveChildInput } from '../dto/archive-child-input.js';
import type { Child } from '../entities/child.entity.js';
import type { Account } from '../../accounts/entities/account.entity.js';
import { AuthSessionEntity } from '../../auth/entities/auth-session.entity.js';
import type { EntityManager } from 'typeorm';
import { childRevision } from './child-revision.js';
import type { UpdateChildInput } from '../dto/update-child-input.js';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError, Not, IsNull } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AccountEntity } from '../../accounts/entities/account.entity.js';
import { ProfessionalEntity } from '../../professionals/entities/professional.entity.js';
import { ChildEntity } from '../entities/child.entity.js';
import type { SessionContext } from '../../auth/auth.types.js';
import type { CreateChildInput } from '../dto/create-child-input.js';
import type {
  ChildSummary,
  ChildView,
  ChildDirectory,
} from '../dto/child-view.js';
import { StoredFileEntity } from '../../files/entities/stored-file.entity.js';
import type { StoredFile } from '../../files/entities/stored-file.entity.js';
import { requireChildOwner } from './professional-access.js';

type SummaryRow = Omit<ChildSummary, 'archived' | 'treatmentActive'> & {
  archivedAt: Date | null;
  treatmentActive: number;
};
type DetailRow = SummaryRow &
  Pick<ChildView, 'guardianName' | 'reportedLevel' | 'notes'> & {
    photoFileId: string | null;
    childUpdatedAt: string;
    accountUpdatedAt: string;
  };
function summary(row: SummaryRow): ChildSummary {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    dateOfBirth: row.dateOfBirth,
    treatmentActive: Number(row.treatmentActive) === 1,
    archived: row.archivedAt !== null,
  };
}
@Injectable()
export class ChildrenService {
  constructor(@Inject(DataSource) private readonly source: DataSource) {}
  private ownedQuery(context: SessionContext, manager?: EntityManager) {
    return (manager ?? this.source)
      .getRepository(ChildEntity)
      .createQueryBuilder('child')
      .innerJoin(
        AccountEntity.options.name,
        'account',
        'account.id = child.accountId',
      )
      .innerJoin(
        ProfessionalEntity.options.name,
        'professional',
        'professional.id = child.professionalId',
      )
      .select('child.id', 'id')
      .addSelect('account.name', 'name')
      .addSelect('account.username', 'username')
      .addSelect('child.dateOfBirth', 'dateOfBirth')
      .addSelect('child.treatmentActive', 'treatmentActive')
      .addSelect('child.archivedAt', 'archivedAt')
      .where('professional.accountId = :owner', { owner: context.user.id })
      .andWhere('professional.archivedAt IS NULL')
      .andWhere('account.role = :role', { role: 'child' });
  }
  async list(
    context: SessionContext,
    after: string | null,
    archived = false,
  ): Promise<ChildDirectory> {
    const query = this.ownedQuery(context)
      .andWhere(
        archived ? 'child.archivedAt IS NOT NULL' : 'child.archivedAt IS NULL',
      )
      .orderBy('child.id', 'ASC')
      .limit(26);
    if (after) query.andWhere('child.id > :after', { after });
    const rows = await query.getRawMany<SummaryRow>();
    const items = rows.slice(0, 25).map(summary);
    return { items, nextCursor: rows.length > 25 ? items.at(-1)!.id : null };
  }
  async detail(
    context: SessionContext,
    id: string,
    manager?: EntityManager,
  ): Promise<ChildView> {
    const row = await this.ownedQuery(context, manager)
      .addSelect('child.guardianName', 'guardianName')
      .addSelect('child.reportedLevel', 'reportedLevel')
      .addSelect('child.notes', 'notes')
      .addSelect('child.photoFileId', 'photoFileId')
      .addSelect(
        "DATE_FORMAT(child.updatedAt, '%Y-%m-%d %H:%i:%s.%f')",
        'childUpdatedAt',
      )
      .addSelect(
        "DATE_FORMAT(account.updatedAt, '%Y-%m-%d %H:%i:%s.%f')",
        'accountUpdatedAt',
      )
      .andWhere('child.id = :id', { id })
      .limit(1)
      .getRawOne<DetailRow>();
    if (!row) throw new NotFoundException();
    const view = {
      ...summary(row),
      guardianName: row.guardianName,
      reportedLevel: row.reportedLevel,
      notes: row.notes,
    };
    return {
      ...view,
      revision: childRevision(
        view,
        row.childUpdatedAt,
        row.accountUpdatedAt,
        row.photoFileId,
      ),
    };
  }
  async create(
    context: SessionContext,
    input: CreateChildInput,
  ): Promise<ChildView> {
    return this.source.transaction(async (manager) => {
      const { professional, now } = await requireChildOwner(manager, context);
      if (input.dateOfBirth > now.toISOString().slice(0, 10))
        throw new BadRequestException();
      const accounts = manager.getRepository(AccountEntity);
      if (await accounts.existsBy({ username: input.username }))
        throw new ConflictException();
      const accountId = randomUUID(),
        id = randomUUID();
      try {
        await accounts.insert({
          id: accountId,
          name: input.name,
          username: input.username,
          role: 'child',
          status: 'pending',
          passwordHash: null,
          createdAt: now,
          updatedAt: now,
          lastSignedInAt: null,
        });
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          typeof error.driverError === 'object' &&
          error.driverError !== null &&
          'code' in error.driverError &&
          error.driverError.code === 'ER_DUP_ENTRY'
        )
          throw new ConflictException();
        throw error;
      }
      await manager.getRepository(ChildEntity).insert({
        id,
        accountId,
        accountRole: 'child',
        professionalId: professional.id,
        dateOfBirth: input.dateOfBirth,
        guardianName: input.guardianName,
        treatmentActive: input.treatmentActive,
        reportedLevel: input.reportedLevel,
        notes: input.notes,
        photoFileId: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return this.detail(context, id, manager);
    });
  }
  async update(
    context: SessionContext,
    id: string,
    input: UpdateChildInput,
  ): Promise<ChildView> {
    return this.withOwnedChild(
      context,
      id,
      input.revision,
      async (manager, child, account, now) => {
        if (child.archivedAt !== null) throw new ConflictException();
        if (input.dateOfBirth > now.toISOString().slice(0, 10))
          throw new BadRequestException();
        const repository = manager.getRepository(AccountEntity);
        if (
          await repository.existsBy({
            username: input.username,
            id: Not(account.id),
          })
        )
          throw new ConflictException();
        try {
          await repository.update(account.id, {
            name: input.name,
            username: input.username,
            updatedAt: now,
          });
        } catch (error) {
          if (
            error instanceof QueryFailedError &&
            typeof error.driverError === 'object' &&
            error.driverError !== null &&
            'code' in error.driverError &&
            error.driverError.code === 'ER_DUP_ENTRY'
          )
            throw new ConflictException();
          throw error;
        }
        await manager.getRepository(ChildEntity).update(child.id, {
          dateOfBirth: input.dateOfBirth,
          guardianName: input.guardianName,
          treatmentActive: input.treatmentActive,
          reportedLevel: input.reportedLevel,
          notes: input.notes,
          updatedAt: now,
        });
        return this.detail(context, id, manager);
      },
    );
  }
  async setArchived(
    context: SessionContext,
    id: string,
    input: ArchiveChildInput,
  ): Promise<ChildView> {
    return this.withOwnedChild(
      context,
      id,
      input.revision,
      async (manager, child, account, now) => {
        if ((child.archivedAt !== null) === input.archived)
          throw new ConflictException();
        if (input.archived) {
          if (account.status === 'active')
            await manager
              .getRepository(AccountEntity)
              .update(account.id, { status: 'suspended', updatedAt: now });
          await manager
            .getRepository(AuthSessionEntity)
            .update(
              { accountId: account.id, revokedAt: IsNull() },
              { revokedAt: now, updatedAt: now },
            );
        }
        await manager.getRepository(ChildEntity).update(child.id, {
          archivedAt: input.archived ? now : null,
          updatedAt: now,
        });
        return this.detail(context, id, manager);
      },
    );
  }

  async photoStorage(
    context: SessionContext,
    id: string,
    mysqlImages: boolean,
  ): Promise<{ storageKey: string; bytes?: Buffer | null }> {
    const query = this.ownedQuery(context)
      .innerJoin(
        StoredFileEntity.options.name,
        'photo',
        'photo.id = child.photoFileId AND photo.professionalId = child.professionalId',
      )
      .select('photo.storageKey', 'storageKey')
      .andWhere('child.id = :id', { id })
      .andWhere('child.archivedAt IS NULL')
      .andWhere('photo.archivedAt IS NULL')
      .andWhere('photo.mediaType = :mediaType', { mediaType: 'image/webp' });
    if (mysqlImages) {
      query
        .leftJoin('stored_image_bytes', 'image', 'image.file_id = photo.id')
        .addSelect('image.image_bytes', 'bytes');
    }
    const photo = await query.getRawOne<{
      storageKey: string;
      bytes?: Buffer | null;
    }>();
    if (!photo) throw new NotFoundException();
    return photo;
  }

  async associatePhoto(
    context: SessionContext,
    id: string,
    revision: string,
    file: Pick<StoredFile, 'id' | 'storageKey' | 'mediaType' | 'sizeBytes'>,
    bytes?: Buffer,
  ): Promise<ChildView> {
    return this.withOwnedChild(
      context,
      id,
      revision,
      async (manager, child, _account, now) => {
        if (child.archivedAt !== null) throw new ConflictException();
        const files = manager.getRepository(StoredFileEntity);
        await files.insert({
          ...file,
          professionalId: child.professionalId,
          originalName: null,
          alternativeText: null,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        });
        if (bytes) {
          await manager.query(
            'INSERT INTO stored_image_bytes (file_id, image_bytes) VALUES (?, ?)',
            [file.id, bytes],
          );
        }
        await manager.getRepository(ChildEntity).update(child.id, {
          photoFileId: file.id,
          updatedAt: now,
        });
        if (child.photoFileId) {
          await files.update(
            { id: child.photoFileId, professionalId: child.professionalId },
            { archivedAt: now, updatedAt: now },
          );
        }
        return this.detail(context, id, manager);
      },
    );
  }

  private async withOwnedChild(
    context: SessionContext,
    id: string,
    revision: string,
    operation: (
      manager: EntityManager,
      child: Child,
      account: Account,
      now: Date,
    ) => Promise<ChildView>,
  ): Promise<ChildView> {
    const found = await this.ownedQuery(context)
      .select('child.accountId', 'accountId')
      .andWhere('child.id = :id', { id })
      .getRawOne<{ accountId: string }>();
    if (!found) throw new NotFoundException();
    return this.source.transaction(async (manager) => {
      const { professional, now, accounts } = await requireChildOwner(
        manager,
        context,
        [found.accountId],
      );
      const child = await manager.getRepository(ChildEntity).findOne({
        where: { id, professionalId: professional.id },
        lock: { mode: 'pessimistic_write' },
      });
      const account = accounts.get(found.accountId);
      if (
        !child ||
        child.accountId !== found.accountId ||
        !account ||
        account.role !== 'child'
      )
        throw new NotFoundException();
      const current = await this.detail(context, id, manager);
      if (current.revision !== revision) throw new ConflictException();
      return operation(manager, child, account, now);
    });
  }
}
