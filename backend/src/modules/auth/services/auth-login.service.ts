import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AUTH_ENVIRONMENT } from '../../../config/auth-environment.js';
import type { AuthEnvironment } from '../../../config/auth-environment.js';
import { AccountEntity } from '../../accounts/entities/account.entity.js';
import { lockAccounts } from '../../accounts/services/locked-accounts.js';
import { AuthSessionEntity } from '../entities/auth-session.entity.js';
import type { LoginInput } from '../dto/login-input.js';
import {
  sessionAbsoluteMilliseconds,
  sessionIdleMilliseconds,
} from '../auth.types.js';
import type { SessionView } from '../auth.types.js';
import {
  createSessionToken,
  sessionDigest,
  csrfToken,
} from '../security/session-tokens.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';
import { PasswordVerificationService } from './password-verification.service.js';
import { childOwnerAccountId, sessionIdentity } from './account-access.js';
import { databaseNow } from './auth-time.js';

@Injectable()
export class AuthLoginService {
  constructor(
    @Inject(DataSource) private readonly source: DataSource,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    @Inject(AuthRateLimitService) private readonly limits: AuthRateLimitService,
    @Inject(PasswordVerificationService)
    private readonly passwords: PasswordVerificationService,
  ) {}

  async login(
    input: LoginInput,
    address: string | undefined,
    previousToken: string | null,
    audience: 'adult' | 'child' = 'adult',
  ): Promise<{ token: string; session: SessionView }> {
    await this.limits.consume(address, input.username);
    const account = await this.source
      .getRepository(AccountEntity)
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.username = :username', { username: input.username })
      .getOne();
    const verified = await this.passwords.verify(
      input.password,
      account?.passwordHash ?? null,
    );
    if (
      !account ||
      !verified ||
      (account.role === 'child') !== (audience === 'child')
    )
      throw new UnauthorizedException();
    return this.source.transaction(async (manager) => {
      const accounts = manager.getRepository(AccountEntity);
      const ownerId =
        audience === 'child'
          ? await childOwnerAccountId(manager, account.id)
          : undefined;
      const locked = await lockAccounts(
        manager,
        ownerId ? [account.id, ownerId] : [account.id],
      );
      const current = locked.get(account.id);
      if (
        !current ||
        current.role !== account.role ||
        current.passwordHash !== account.passwordHash
      )
        throw new UnauthorizedException();
      const user = await sessionIdentity(
        manager,
        current,
        ownerId ? locked.get(ownerId) : undefined,
      );
      if (!user) throw new UnauthorizedException();
      const now = await databaseNow(manager);
      const token = createSessionToken();
      const expiresAt = new Date(now.getTime() + sessionAbsoluteMilliseconds);
      const idleExpiresAt = new Date(now.getTime() + sessionIdleMilliseconds);
      const sessions = manager.getRepository(AuthSessionEntity);
      if (previousToken)
        await sessions.update(
          { sessionDigest: sessionDigest(previousToken), revokedAt: IsNull() },
          { revokedAt: now },
        );
      await sessions.insert({
        id: randomUUID(),
        accountId: current.id,
        sessionDigest: sessionDigest(token),
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
        idleExpiresAt,
        expiresAt,
      });
      await accounts.update(current.id, { lastSignedInAt: now });
      return {
        token,
        session: {
          user,
          csrfToken: csrfToken(this.environment.secret, token),
          expiresAt: expiresAt.toISOString(),
          idleExpiresAt: idleExpiresAt.toISOString(),
        },
      };
    });
  }
}
