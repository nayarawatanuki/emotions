import type { EntityManager } from 'typeorm';
import { IsNull } from 'typeorm';
import type { Account } from '../../accounts/entities/account.entity.js';
import { ProfessionalEntity } from '../../professionals/entities/professional.entity.js';
import type { AuthUser } from '../auth.types.js';
import { ChildEntity } from '../../children/entities/child.entity.js';

export async function childOwnerAccountId(
  manager: EntityManager,
  childAccountId: string,
) {
  const owner = await manager
    .getRepository(ChildEntity)
    .createQueryBuilder('child')
    .innerJoin(
      ProfessionalEntity.options.name,
      'professional',
      'professional.id = child.professionalId',
    )
    .select('professional.accountId', 'accountId')
    .where('child.accountId = :childAccountId', { childAccountId })
    .getRawOne<{ accountId: string }>();
  return owner?.accountId;
}

export async function activeChildProfile(
  manager: EntityManager,
  accountId: string,
  owner: Account | undefined,
) {
  if (
    owner?.role !== 'professional' ||
    owner.status !== 'active' ||
    !owner.passwordHash
  )
    return null;
  const professional = await manager.getRepository(ProfessionalEntity).findOne({
    where: { accountId: owner.id },
    lock: { mode: 'pessimistic_write' },
  });
  if (!professional || professional.archivedAt !== null) return null;
  const child = await manager.getRepository(ChildEntity).findOne({
    where: { accountId },
    lock: { mode: 'pessimistic_write' },
  });
  return child?.archivedAt === null && child.professionalId === professional.id
    ? child
    : null;
}

export async function sessionIdentity(
  manager: EntityManager,
  account: Account,
  owner?: Account,
): Promise<AuthUser | null> {
  if (account.role !== 'child') return adultIdentity(manager, account);
  if (
    account.status !== 'active' ||
    !account.passwordHash ||
    !(await activeChildProfile(manager, account.id, owner))
  )
    return null;
  return { id: account.id, name: account.name, role: 'child' };
}

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
