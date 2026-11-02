import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import { readDatabaseEnvironment } from '../src/config/database-environment.js';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { initializeDataSource } from '../src/database/database.module.js';
import { AccountEntity } from '../src/modules/accounts/entities/account.entity.js';
import { AccountTokenEntity } from '../src/modules/auth/entities/account-token.entity.js';
import { AuthSessionEntity } from '../src/modules/auth/entities/auth-session.entity.js';
import { AuthRateLimitEntity } from '../src/modules/auth/entities/auth-rate-limit.entity.js';

describe('authentication constraints on real MySQL after approved migration', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let verifiedEmpty = false;
  const tables = [
    'auth_sessions',
    'account_tokens',
    'auth_rate_limits',
    'accounts',
    'professionals',
    'children',
    'files',
    'activities',
    'activity_options',
    'rewards',
    'activity_results',
    'activity_attempts',
  ] as const;
  const createdAt = new Date('2026-01-01T12:00:00.000Z');
  const expiresAt = new Date('2026-01-02T12:00:00.000Z');
  const consumedAt = new Date('2026-01-01T13:00:00.000Z');

  async function assertEmpty() {
    for (const table of tables) {
      expect(
        await source.query(`SELECT COUNT(*) AS total FROM \`${table}\``),
      ).toEqual([{ total: '0' }]);
    }
  }

  async function account(role: 'administrator' | 'professional' | 'child') {
    const id = randomUUID();
    await runner.manager.getRepository(AccountEntity).insert({
      id,
      name: 'Synthetic authentication fixture',
      username: `fixture_${randomUUID()}`,
      role,
      status: 'pending',
      passwordHash: null,
    });
    return id;
  }

  async function token() {
    return {
      id: randomUUID(),
      accountId: await account('professional'),
      issuedByAccountId: await account('administrator'),
      purpose: 'activation' as const,
      tokenDigest: 'a'.repeat(64),
      createdAt,
      expiresAt,
    };
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
    const applied = await source.query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM schema_migrations WHERE name = ?',
      ['AddAuthenticationPersistence1793520002000'],
    );
    if (applied[0]?.total !== '1')
      throw new Error(
        'Authentication migration must be reviewed and applied before running this suite. No fixture was inserted.',
      );
    await assertEmpty();
    verifiedEmpty = true;
  });
  beforeEach(async () => {
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
  });
  afterEach(async () => {
    if (runner) {
      try {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
      } finally {
        await runner.release();
      }
    }
  });
  afterAll(async () => {
    try {
      if (verifiedEmpty) await assertEmpty();
    } finally {
      if (source?.isInitialized) await source.destroy();
    }
  });

  it('allows a pending account without a password and rejects activation without a hash', async () => {
    const id = await account('professional');
    const accounts = runner.manager.getRepository(AccountEntity);
    await expect(
      accounts.update(id, { status: 'active' }),
    ).rejects.toMatchObject({
      driverError: { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
    });
    expect((await accounts.findOneByOrFail({ id })).status).toBe('pending');
    await accounts.update(id, {
      passwordHash: 'synthetic-fixture-not-a-login-credential',
      status: 'active',
    });
    expect((await accounts.findOneByOrFail({ id })).status).toBe('active');
  });

  it('rejects empty stored passwords even on pending accounts', async () => {
    const id = await account('professional');
    await expect(
      runner.manager
        .getRepository(AccountEntity)
        .update(id, { passwordHash: '' }),
    ).rejects.toMatchObject({
      driverError: { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
    });
  });

  it('hides the token digest and forbids duplicate tokens', async () => {
    const value = await token();
    const tokens = runner.manager.getRepository(AccountTokenEntity);
    await tokens.insert(value);
    expect(await tokens.findOneByOrFail({ id: value.id })).not.toHaveProperty(
      'tokenDigest',
    );
    await expect(
      tokens.insert({ ...value, id: randomUUID() }),
    ).rejects.toMatchObject({ driverError: { code: 'ER_DUP_ENTRY' } });
  });

  it('rejects a token issuer that is not an administrator', async () => {
    const value = await token();
    await expect(
      runner.manager
        .getRepository(AccountTokenEntity)
        .insert({ ...value, issuedByAccountId: value.accountId }),
    ).rejects.toMatchObject({
      driverError: {
        code: expect.stringMatching(/^ER_NO_REFERENCED_ROW(?:_2)?$/),
      },
    });
  });

  it('rejects a token for a child account', async () => {
    const value = await token();
    await expect(
      runner.manager
        .getRepository(AccountTokenEntity)
        .insert({ ...value, accountId: await account('child') }),
    ).rejects.toMatchObject({
      driverError: {
        code: expect.stringMatching(/^ER_NO_REFERENCED_ROW(?:_2)?$/),
      },
    });
  });

  it.each([
    { consumedAt, revokedAt: consumedAt },
    { consumedAt: new Date('2026-01-03T12:00:00Z') },
    { expiresAt: createdAt },
  ])('rejects contradictory token lifecycle dates: %j', async (dates) => {
    await expect(
      runner.manager
        .getRepository(AccountTokenEntity)
        .insert({ ...(await token()), ...dates }),
    ).rejects.toMatchObject({
      driverError: { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
    });
  });

  it('bounds idle expiry by absolute expiry and hides session digests', async () => {
    const sessions = runner.manager.getRepository(AuthSessionEntity);
    const value = {
      id: randomUUID(),
      accountId: await account('administrator'),
      sessionDigest: 'b'.repeat(64),
      createdAt,
      lastSeenAt: createdAt,
      idleExpiresAt: consumedAt,
      expiresAt,
    };
    await sessions.insert(value);
    expect(await sessions.findOneByOrFail({ id: value.id })).not.toHaveProperty(
      'sessionDigest',
    );
    const defaultId = randomUUID();
    await sessions.insert({
      id: defaultId,
      accountId: value.accountId,
      sessionDigest: 'd'.repeat(64),
      idleExpiresAt: new Date(Date.now() + 30 * 60_000),
      expiresAt: new Date(Date.now() + 8 * 60 * 60_000),
    });
    const defaultSession = await sessions.findOneByOrFail({ id: defaultId });
    expect(defaultSession.lastSeenAt).toEqual(defaultSession.createdAt);

    await expect(
      sessions.update(value.id, {
        idleExpiresAt: new Date('2026-01-03T12:00:00Z'),
      }),
    ).rejects.toMatchObject({
      driverError: { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
    });
    await expect(
      sessions.insert({ ...value, id: randomUUID() }),
    ).rejects.toMatchObject({ driverError: { code: 'ER_DUP_ENTRY' } });
  });

  it('separates rate-limit scopes and rejects duplicate counters within a scope', async () => {
    const limits = runner.manager.getRepository(AuthRateLimitEntity);
    const value = {
      id: randomUUID(),
      scope: 'login_origin' as const,
      keyDigest: 'c'.repeat(64),
      windowStartedAt: createdAt,
      windowExpiresAt: consumedAt,
    };
    await limits.insert(value);
    expect(await limits.findOneByOrFail({ id: value.id })).not.toHaveProperty(
      'keyDigest',
    );
    await expect(
      limits.insert({ ...value, id: randomUUID() }),
    ).rejects.toMatchObject({ driverError: { code: 'ER_DUP_ENTRY' } });
    await limits.insert({
      ...value,
      id: randomUUID(),
      scope: 'login_origin_account',
    });
    expect(await limits.count()).toBe(2);
    await expect(
      limits.update(value.id, { windowExpiresAt: createdAt }),
    ).rejects.toMatchObject({
      driverError: { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
    });
  });
});
