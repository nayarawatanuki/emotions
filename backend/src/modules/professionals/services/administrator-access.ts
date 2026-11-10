import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { Account } from '../../accounts/entities/account.entity.js';
import { AuthSessionEntity } from '../../auth/entities/auth-session.entity.js';
import { databaseNow } from '../../auth/services/auth-time.js';
import type { SessionContext } from '../../auth/auth.types.js';

export async function requireAdministrator(
  manager: EntityManager,
  context: SessionContext,
  account: Account | undefined,
): Promise<{ account: Account; now: Date }> {
  if (!account || account.status !== 'active' || account.passwordHash === null)
    throw new UnauthorizedException();
  if (account.role !== 'administrator') throw new ForbiddenException();
  const session = await manager
    .getRepository(AuthSessionEntity)
    .findOne({
      where: { id: context.id, accountId: account.id },
      lock: { mode: 'pessimistic_write' },
    });
  const now = await databaseNow(manager);
  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt <= now ||
    session.idleExpiresAt <= now
  )
    throw new UnauthorizedException();
  return { account, now };
}
