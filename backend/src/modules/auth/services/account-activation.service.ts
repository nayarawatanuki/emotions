import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AUTH_ENVIRONMENT } from '../../../config/auth-environment.js';
import type { AuthEnvironment } from '../../../config/auth-environment.js';
import { AccountEntity } from '../../accounts/entities/account.entity.js';
import type { Account } from '../../accounts/entities/account.entity.js';
import { lockAccounts } from '../../accounts/services/locked-accounts.js';
import { ProfessionalEntity } from '../../professionals/entities/professional.entity.js';
import { AccountTokenEntity } from '../entities/account-token.entity.js';
import { AuthSessionEntity } from '../entities/auth-session.entity.js';
import type { ActivationInput } from '../dto/activation-input.js';
import type { ActivationLink } from '../dto/activation-link.js';
import {
  createOpaqueToken,
  opaqueTokenDigest,
} from '../security/opaque-tokens.js';
import { PasswordService } from './password.service.js';
import { PasswordCapacityService } from './password-capacity.service.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';
import { databaseNow } from './auth-time.js';

function isPendingProfessional(
  account: Account | undefined,
): account is Account {
  return (
    !!account &&
    account.role === 'professional' &&
    account.status === 'pending' &&
    account.passwordHash === null
  );
}

function isActiveAdministrator(
  account: Account | undefined,
): account is Account {
  return (
    !!account &&
    account.role === 'administrator' &&
    account.status === 'active' &&
    typeof account.passwordHash === 'string' &&
    account.passwordHash.length > 0
  );
}

@Injectable()
export class AccountActivationService {
  constructor(
    @Inject(DataSource) private readonly source: DataSource,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(PasswordCapacityService)
    private readonly capacity: PasswordCapacityService,
    @Inject(AuthRateLimitService) private readonly limits: AuthRateLimitService,
  ) {}

  // The onboarding transaction owns the locks and validates the administrator session/profile.
  async issue(
    manager: EntityManager,
    account: Account,
    issuer: Account,
    now: Date,
  ): Promise<ActivationLink> {
    if (!isPendingProfessional(account) || !isActiveAdministrator(issuer))
      throw new ConflictException();
    const tokens = manager.getRepository(AccountTokenEntity);
    await tokens.update(
      {
        accountId: account.id,
        purpose: 'activation',
        consumedAt: IsNull(),
        revokedAt: IsNull(),
      },
      { revokedAt: now },
    );
    const token = createOpaqueToken();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60_000);
    await tokens.insert({
      id: randomUUID(),
      accountId: account.id,
      accountRole: 'professional',
      issuedByAccountId: issuer.id,
      issuedByRole: 'administrator',
      purpose: 'activation',
      tokenDigest: opaqueTokenDigest(token),
      createdAt: now,
      updatedAt: now,
      expiresAt,
      consumedAt: null,
      revokedAt: null,
    });
    const url = new URL('/activate-account', this.environment.origin);
    url.hash = `token=${token}`;
    return { url: url.toString(), expiresAt: expiresAt.toISOString() };
  }

  async activate(
    input: ActivationInput,
    address: string | undefined,
  ): Promise<void> {
    await this.limits.consumeActivation(address);
    const digest = opaqueTokenDigest(input.token);
    const found = await this.source
      .getRepository(AccountTokenEntity)
      .createQueryBuilder('token')
      .where('token.tokenDigest = :digest', { digest })
      .andWhere('token.purpose = :purpose', { purpose: 'activation' })
      .andWhere('token.consumedAt IS NULL AND token.revokedAt IS NULL')
      .andWhere('token.expiresAt > UTC_TIMESTAMP(6)')
      .getOne();
    if (!found) throw new BadRequestException();
    // Hashing never holds account, profile or token locks.
    const passwordHash = await this.capacity.run(() =>
      this.passwords.hash(input.password),
    );
    await this.source.transaction(async (manager) => {
      const accounts = await lockAccounts(manager, [
        found.accountId,
        found.issuedByAccountId,
      ]);
      const account = accounts.get(found.accountId);
      const issuer = accounts.get(found.issuedByAccountId);
      const profile = await manager.getRepository(ProfessionalEntity).findOne({
        where: { accountId: found.accountId },
        lock: { mode: 'pessimistic_write' },
      });
      const tokens = manager.getRepository(AccountTokenEntity);
      const token = await tokens.findOne({
        where: { id: found.id, tokenDigest: digest, purpose: 'activation' },
        lock: { mode: 'pessimistic_write' },
      });
      const now = await databaseNow(manager);
      if (
        !isPendingProfessional(account) ||
        !isActiveAdministrator(issuer) ||
        !profile ||
        profile.archivedAt !== null ||
        !token ||
        token.accountId !== found.accountId ||
        token.issuedByAccountId !== found.issuedByAccountId ||
        token.consumedAt !== null ||
        token.revokedAt !== null ||
        token.expiresAt <= now
      )
        throw new BadRequestException();
      const updated = await manager
        .getRepository(AccountEntity)
        .update(
          { id: account.id, status: 'pending', passwordHash: IsNull() },
          { passwordHash, status: 'active' },
        );
      const consumed = await tokens.update(
        { id: token.id, consumedAt: IsNull(), revokedAt: IsNull() },
        { consumedAt: now },
      );
      if (updated.affected !== 1 || consumed.affected !== 1)
        throw new BadRequestException();
      await tokens.update(
        { accountId: account.id, consumedAt: IsNull(), revokedAt: IsNull() },
        { revokedAt: now },
      );
      await manager
        .getRepository(AuthSessionEntity)
        .update(
          { accountId: account.id, revokedAt: IsNull() },
          { revokedAt: now },
        );
    });
  }
}
