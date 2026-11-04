import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountEntity } from '../../accounts/entities/account.entity.js';
import { AuthSessionEntity } from '../entities/auth-session.entity.js';
import { sessionIdleMilliseconds } from '../auth.types.js';
import type { SessionContext } from '../auth.types.js';
import { sessionDigest } from '../security/session-tokens.js';
import { adultIdentity } from './account-access.js';
import { databaseNow } from './auth-time.js';

@Injectable()
export class AuthSessionService {
  constructor(@Inject(DataSource) private readonly source: DataSource) {}

  async authenticate(token: string): Promise<SessionContext> {
    // Lookup establishes the account; all writers then lock account -> profile -> session.
    const found = await this.source
      .getRepository(AuthSessionEntity)
      .findOneBy({ sessionDigest: sessionDigest(token) });
    if (!found) throw new UnauthorizedException();
    const context = await this.source.transaction(async (manager) => {
      const account = await manager
        .getRepository(AccountEntity)
        .createQueryBuilder('account')
        .addSelect('account.passwordHash')
        .where('account.id = :id', { id: found.accountId })
        .setLock('pessimistic_write')
        .getOne();
      const user = account ? await adultIdentity(manager, account) : null;
      const sessions = manager.getRepository(AuthSessionEntity);
      const session = await sessions.findOne({
        where: { id: found.id },
        lock: { mode: 'pessimistic_write' },
      });
      const now = await databaseNow(manager);
      if (!session || session.revokedAt !== null) return null;
      if (!user || session.expiresAt <= now || session.idleExpiresAt <= now) {
        await sessions.update(session.id, { revokedAt: now });
        return null;
      }
      session.lastSeenAt = now;
      session.idleExpiresAt = new Date(
        Math.min(
          now.getTime() + sessionIdleMilliseconds,
          session.expiresAt.getTime(),
        ),
      );
      await sessions.update(session.id, {
        lastSeenAt: session.lastSeenAt,
        idleExpiresAt: session.idleExpiresAt,
      });
      return {
        id: session.id,
        user,
        expiresAt: session.expiresAt,
        idleExpiresAt: session.idleExpiresAt,
      };
    });
    // Revocation must commit even when the public response is 401.
    if (!context) throw new UnauthorizedException();
    return context;
  }

  async logout(id: string): Promise<void> {
    await this.source.transaction(async (manager) => {
      const now = await databaseNow(manager);
      await manager
        .getRepository(AuthSessionEntity)
        .update(id, { revokedAt: now });
    });
  }
}
