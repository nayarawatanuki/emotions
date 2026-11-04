import type { EntityManager } from 'typeorm';
import { IsNull } from 'typeorm';
import type { Account } from '../../accounts/entities/account.entity.js';
import { ProfessionalEntity } from '../../professionals/entities/professional.entity.js';
import type { AuthUser } from '../auth.types.js';

export async function adultIdentity(
  manager: EntityManager,
  account: Account,
): Promise<AuthUser | null> {
  if (
    account.status !== 'active' ||
    account.passwordHash === null ||
    (account.role !== 'administrator' && account.role !== 'professional')
  )
    return null;
  if (account.role === 'professional') {
    const professional = await manager
      .getRepository(ProfessionalEntity)
      .findOne({
        where: { accountId: account.id, archivedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
    if (!professional) return null;
  }
  return { id: account.id, name: account.name, role: account.role };
}
