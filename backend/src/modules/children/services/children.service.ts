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
import { DataSource, QueryFailedError, Not } from 'typeorm';
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
import { requireChildOwner } from './professional-access.js';

type SummaryRow = Omit<ChildSummary, 'archived' | 'treatmentActive'> & {
  archivedAt: Date | null;
  treatmentActive: number;
};
type DetailRow = SummaryRow &
  Pick<ChildView, 'guardianName' | 'reportedLevel' | 'notes'> & {
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
  ): Promise<ChildDirectory> {
    const query = this.ownedQuery(context).orderBy('child.id', 'ASC').limit(26);
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
      revision: childRevision(view, row.childUpdatedAt, row.accountUpdatedAt),
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
      const child = await manager
        .getRepository(ChildEntity)
        .findOne({
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
      if (child.archivedAt !== null) throw new ConflictException();
      const current = await this.detail(context, id, manager);
      if (current.revision !== input.revision) throw new ConflictException();
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
      await manager
        .getRepository(ChildEntity)
        .update(child.id, {
          dateOfBirth: input.dateOfBirth,
          guardianName: input.guardianName,
          treatmentActive: input.treatmentActive,
          reportedLevel: input.reportedLevel,
          notes: input.notes,
          updatedAt: now,
        });
      return this.detail(context, id, manager);
    });
  }
}
