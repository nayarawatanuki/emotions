import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { lockAccounts } from '../../accounts/services/locked-accounts.js';
import { ProfessionalEntity } from '../../professionals/entities/professional.entity.js';
import { AuthSessionEntity } from '../../auth/entities/auth-session.entity.js';
import type { SessionContext } from '../../auth/auth.types.js';
import { databaseNow } from '../../auth/services/auth-time.js';

export async function requireChildOwner(
  manager: EntityManager,
  context: SessionContext,
) {
  const account = (await lockAccounts(manager, [context.user.id])).get(
    context.user.id,
  );
  if (!account || account.status !== 'active' || !account.passwordHash)
    throw new UnauthorizedException();
  if (account.role !== 'professional') throw new ForbiddenException();
  const professional = await manager
    .getRepository(ProfessionalEntity)
    .findOne({
      where: { accountId: account.id },
      lock: { mode: 'pessimistic_write' },
    });
  if (!professional || professional.archivedAt !== null)
    throw new UnauthorizedException();
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
  return { professional, now };
}
