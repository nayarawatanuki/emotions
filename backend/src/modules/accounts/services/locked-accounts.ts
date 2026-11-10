import type { EntityManager } from 'typeorm';
import { AccountEntity } from '../entities/account.entity.js';
import type { Account } from '../entities/account.entity.js';

export async function lockAccounts(
  manager: EntityManager,
  ids: readonly string[],
): Promise<Map<string, Account>> {
  const accounts = new Map<string, Account>();
  // Every multi-account operation uses UUID order, including activation and reissue.
  for (const id of Array.from(new Set(ids)).sort()) {
    const account = await manager
      .getRepository(AccountEntity)
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
    if (account) accounts.set(id, account);
  }
  return accounts;
}
