import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProfessionalEntity } from '../entities/professional.entity.js';
import { AccountEntity } from '../../accounts/entities/account.entity.js';
import type {
  ProfessionalDirectory,
  ProfessionalSummary,
} from '../dto/professional-directory.js';

type DirectoryRow = Omit<ProfessionalSummary, 'archived'> & {
  archivedAt: Date | null;
};

@Injectable()
export class ProfessionalDirectoryService {
  constructor(@Inject(DataSource) private readonly source: DataSource) {}

  async list(after: string | null): Promise<ProfessionalDirectory> {
    const query = this.source
      .getRepository(ProfessionalEntity)
      .createQueryBuilder('profile')
      .innerJoin(
        AccountEntity.options.name,
        'account',
        'account.id = profile.accountId',
      )
      .select('profile.id', 'id')
      .addSelect('account.id', 'accountId')
      .addSelect('account.name', 'name')
      .addSelect('account.username', 'username')
      .addSelect('account.status', 'status')
      .addSelect('profile.archivedAt', 'archivedAt')
      .where('account.role = :role', { role: 'professional' })
      .orderBy('profile.id', 'ASC')
      .limit(26);
    if (after) query.andWhere('profile.id > :after', { after });
    const rows = await query.getRawMany<DirectoryRow>();
    const hasNext = rows.length > 25;
    const items = rows.slice(0, 25).map(({ archivedAt, ...identity }) => ({
      ...identity,
      archived: archivedAt !== null,
    }));
    return { items, nextCursor: hasNext ? items.at(-1)!.id : null };
  }
}
