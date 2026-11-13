import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
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
  Pick<ChildView, 'guardianName' | 'reportedLevel' | 'notes'>;
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
  private ownedQuery(context: SessionContext) {
    return this.source
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
  async detail(context: SessionContext, id: string): Promise<ChildView> {
    const row = await this.ownedQuery(context)
      .addSelect('child.guardianName', 'guardianName')
      .addSelect('child.reportedLevel', 'reportedLevel')
      .addSelect('child.notes', 'notes')
      .andWhere('child.id = :id', { id })
      .limit(1)
      .getRawOne<DetailRow>();
    if (!row) throw new NotFoundException();
    return {
      ...summary(row),
      guardianName: row.guardianName,
      reportedLevel: row.reportedLevel,
      notes: row.notes,
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
      await manager
        .getRepository(ChildEntity)
        .insert({
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
      return {
        id,
        name: input.name,
        username: input.username,
        dateOfBirth: input.dateOfBirth,
        guardianName: input.guardianName,
        treatmentActive: input.treatmentActive,
        reportedLevel: input.reportedLevel,
        notes: input.notes,
        archived: false,
      };
    });
  }
}
