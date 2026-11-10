import { randomUUID } from 'node:crypto';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource, IsNull, Not } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { readDatabaseEnvironment } from '../src/config/database-environment.js';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { initializeDataSource } from '../src/database/database.module.js';
import { AccountEntity } from '../src/modules/accounts/entities/account.entity.js';
import { ProfessionalEntity } from '../src/modules/professionals/entities/professional.entity.js';
import { AccountTokenEntity } from '../src/modules/auth/entities/account-token.entity.js';
import { AuthSessionEntity } from '../src/modules/auth/entities/auth-session.entity.js';
import { AuthRateLimitEntity } from '../src/modules/auth/entities/auth-rate-limit.entity.js';
import { ProfessionalOnboardingService } from '../src/modules/professionals/services/professional-onboarding.service.js';
import { AccountActivationService } from '../src/modules/auth/services/account-activation.service.js';
import { PasswordService } from '../src/modules/auth/services/password.service.js';
import { databaseNow } from '../src/modules/auth/services/auth-time.js';
import {
  createOpaqueToken,
  opaqueTokenDigest,
} from '../src/modules/auth/security/opaque-tokens.js';
import { keyedDigest } from '../src/modules/auth/security/session-tokens.js';
import type { SessionContext } from '../src/modules/auth/auth.types.js';
import type { ProfessionalInvitation } from '../src/modules/professionals/dto/professional-invitation.js';
import type { ActivationLink } from '../src/modules/auth/dto/activation-link.js';

const origin = 'http://127.0.0.1:3100';
const secret = '0123456789abcdef'.repeat(4);
const address = '198.51.100.83';
const passwords = [
  'Synthetic first concurrent phrase 🎀',
  'Synthetic second concurrent phrase 🧩',
];

describe('onboarding concurrency with independent MySQL transactions', () => {
  let source: DataSource;
  let app: NestExpressApplication;
  let onboarding: ProfessionalOnboardingService;
  let activation: AccountActivationService;
  let context: SessionContext;
  let username: string;
  let adminUsername: string;
  let fixturePath: string;
  let hash: string;
  let verifiedEmpty = false;
  async function assertEmpty() {
    for (const metadata of source.entityMetadatas)
      expect(
        await source.query(
          `SELECT COUNT(*) AS total FROM \`${metadata.tableName}\``,
        ),
      ).toEqual([{ total: '0' }]);
  }
  beforeAll(async () => {
    const environment = readDatabaseEnvironment(process.env);
    if (
      !environment ||
      environment.database !== 'emotions_development' ||
      !['localhost', '127.0.0.1', '::1'].includes(environment.host)
    )
      throw new Error('Tests require the isolated local development database.');
    source = await initializeDataSource(createDatabaseOptions(environment));
    await assertEmpty();
    verifiedEmpty = true;
    hash = await new PasswordService().hash(
      'Synthetic administrator fixture phrase',
    );
    const fixture = await Test.createTestingModule({
      imports: [
        AppModule.register({
          ...process.env,
          NODE_ENV: 'test',
          AUTH_ENABLED: 'true',
          AUTH_ORIGIN: origin,
          AUTH_SECRET: secret,
        }),
      ],
    })
      .overrideProvider(DataSource)
      .useValue(source)
      .compile();
    app = fixture.createNestApplication({ bodyParser: false });
    app.useLogger(false);
    await app.init();
    onboarding = app.get(ProfessionalOnboardingService);
    activation = app.get(AccountActivationService);
  });
  beforeEach(async () => {
    const adminId = randomUUID();
    const sessionId = randomUUID();
    username = `fixture_onboard_${randomUUID()}`;
    adminUsername = `fixture_operator_${adminId}`;
    fixturePath = join(tmpdir(), `emotions-onboarding-fixture-${adminId}.json`);
    // Recovery metadata only: no password, token, database credential or personal information.
    writeFileSync(
      fixturePath,
      JSON.stringify({
        database: 'emotions_development',
        adminId,
        sessionId,
        adminUsername,
        username,
      }),
      { mode: 0o600 },
    );
    const now = await databaseNow(source.manager);
    context = {
      id: sessionId,
      user: {
        id: adminId,
        name: 'Synthetic concurrency administrator',
        role: 'administrator',
      },
      expiresAt: new Date(now.getTime() + 8 * 60 * 60_000),
      idleExpiresAt: new Date(now.getTime() + 30 * 60_000),
    };
    await source.getRepository(AccountEntity).insert({
      id: adminId,
      username: adminUsername,
      name: context.user.name,
      role: 'administrator',
      status: 'active',
      passwordHash: hash,
    });
    await source.getRepository(AuthSessionEntity).insert({
      id: sessionId,
      accountId: adminId,
      sessionDigest: opaqueTokenDigest(createOpaqueToken()),
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      idleExpiresAt: context.idleExpiresAt,
      expiresAt: context.expiresAt,
    });
  });
  afterEach(async () => {
    if (!verifiedEmpty || !context) return;
    // Only rows belonging to these exact synthetic identities are removed, in FK order.
    const accounts = source.getRepository(AccountEntity);
    const target = await accounts.findOneBy({ username });
    if (target) {
      expect(target.role).toBe('professional');
      await source
        .getRepository(AccountTokenEntity)
        .delete({ accountId: target.id });
      await source
        .getRepository(AuthSessionEntity)
        .delete({ accountId: target.id });
      await source
        .getRepository(ProfessionalEntity)
        .delete({ accountId: target.id });
      await accounts.delete({ id: target.id, username, role: 'professional' });
    }
    await source
      .getRepository(AuthSessionEntity)
      .delete({ id: context.id, accountId: context.user.id });
    await accounts.delete({
      id: context.user.id,
      username: adminUsername,
      role: 'administrator',
    });
    await source.getRepository(AuthRateLimitEntity).delete({
      scope: 'token_redemption',
      keyDigest: keyedDigest(secret, 'activation-origin-v1', [address]),
    });
    await assertEmpty();
    if (existsSync(fixturePath)) unlinkSync(fixturePath);
  });
  afterAll(async () => {
    if (app) await app.close();
    if (source?.isInitialized) await source.destroy();
  });
  function raw(link: ActivationLink) {
    const value = new URLSearchParams(new URL(link.url).hash.slice(1)).get(
      'token',
    );
    if (!value) throw new Error('Missing synthetic token');
    return value;
  }
  function create(): Promise<ProfessionalInvitation> {
    return onboarding.create(
      { name: 'Synthetic concurrent invitee', username },
      context,
    );
  }

  it('consumes one link exactly once and preserves the winning password', async () => {
    const invitation = await create();
    const token = raw(invitation.activation);
    const results = await Promise.allSettled(
      passwords.map((password) =>
        activation.activate({ token, password }, address),
      ),
    );
    const winners = results.flatMap((result, index) =>
      result.status === 'fulfilled' ? [index] : [],
    );
    expect(winners).toHaveLength(1);
    for (const result of results)
      if (result.status === 'rejected')
        expect(result.reason).toBeInstanceOf(BadRequestException);
    const account = await source
      .getRepository(AccountEntity)
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.id = :id', { id: invitation.professional.accountId })
      .getOneOrFail();
    expect(account.status).toBe('active');
    if (!account.passwordHash)
      throw new Error('Missing activated fixture hash');
    const verifier = new PasswordService();
    for (let index = 0; index < passwords.length; index++)
      expect(
        await verifier.verify(passwords[index]!, account.passwordHash),
      ).toBe(index === winners[0]);
    const grant = await source
      .getRepository(AccountTokenEntity)
      .findOneByOrFail({ accountId: account.id });
    expect(grant.consumedAt).toBeInstanceOf(Date);
    expect(grant.revokedAt).toBeNull();
  });

  it('serializes duplicate registrations without creating an orphan account or profile', async () => {
    const results = await Promise.allSettled([create(), create()]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    for (const result of results)
      if (result.status === 'rejected')
        expect(result.reason).toBeInstanceOf(ConflictException);
    const account = await source
      .getRepository(AccountEntity)
      .findOneByOrFail({ username });
    expect(
      await source
        .getRepository(ProfessionalEntity)
        .countBy({ accountId: account.id }),
    ).toBe(1);
    expect(
      await source
        .getRepository(AccountTokenEntity)
        .countBy({ accountId: account.id }),
    ).toBe(1);
  });

  it('serializes reissue against activation without accepting a revoked token', async () => {
    const invitation = await create();
    const token = raw(invitation.activation);
    const [consumption, replacement] = await Promise.allSettled([
      activation.activate({ token, password: passwords[0]! }, address),
      onboarding.reissue(invitation.professional.id, context),
    ]);
    if (replacement.status === 'fulfilled') {
      expect(consumption.status).toBe('rejected');
      if (consumption.status === 'rejected')
        expect(consumption.reason).toBeInstanceOf(BadRequestException);
      await activation.activate(
        { token: raw(replacement.value), password: passwords[1]! },
        address,
      );
    } else {
      expect(replacement.reason).toBeInstanceOf(ConflictException);
      expect(consumption.status).toBe('fulfilled');
    }
    expect(
      (
        await source
          .getRepository(AccountEntity)
          .findOneByOrFail({ id: invitation.professional.accountId })
      ).status,
    ).toBe('active');
    expect(
      await source.getRepository(AccountTokenEntity).countBy({
        accountId: invitation.professional.accountId,
        consumedAt: Not(IsNull()),
      }),
    ).toBe(1);
  });
});
