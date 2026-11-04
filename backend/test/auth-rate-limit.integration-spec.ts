import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { readDatabaseEnvironment } from '../src/config/database-environment.js';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { initializeDataSource } from '../src/database/database.module.js';
import { AuthRateLimitEntity } from '../src/modules/auth/entities/auth-rate-limit.entity.js';
import { AuthRateLimitService } from '../src/modules/auth/services/auth-rate-limit.service.js';
import { keyedDigest } from '../src/modules/auth/security/session-tokens.js';
import { RateLimitException } from '../src/common/exceptions/rate-limit.exception.js';

const environment = {
  origin: 'http://127.0.0.1:3100',
  secret: '0123456789abcdef'.repeat(4),
  secureCookie: false,
  cookieName: 'emotions_session_local',
};
const address = '198.51.100.73'; // Documentation-only address, never a real user's origin.

describe('shared login counters on independent MySQL transactions', () => {
  let source: DataSource;
  let limits: AuthRateLimitService;
  let usernames: string[];
  let verifiedEmpty = false;

  function originKey() {
    return keyedDigest(environment.secret, 'login-origin-v1', [address]);
  }
  function pairKey(username: string) {
    return keyedDigest(environment.secret, 'login-origin-account-v1', [
      address,
      username,
    ]);
  }
  function username() {
    const value = `synthetic_${randomUUID()}`;
    usernames.push(value);
    return value;
  }
  async function assertEmpty() {
    for (const metadata of source.entityMetadatas)
      expect(
        await source.query(
          `SELECT COUNT(*) AS total FROM \`${metadata.tableName}\``,
        ),
      ).toEqual([{ total: '0' }]);
  }

  beforeAll(async () => {
    const database = readDatabaseEnvironment(process.env);
    if (
      !database ||
      database.database !== 'emotions_development' ||
      !['localhost', '127.0.0.1', '::1'].includes(database.host)
    )
      throw new Error('Tests require the isolated local development database.');
    source = await initializeDataSource(createDatabaseOptions(database));
    await assertEmpty();
    verifiedEmpty = true;
    limits = new AuthRateLimitService(source, environment);
  });
  beforeEach(() => {
    usernames = [];
  });
  afterEach(async () => {
    if (!verifiedEmpty) return;
    // These two scopes and HMAC keys belong only to this explicitly synthetic fixture.
    const counters = source.getRepository(AuthRateLimitEntity);
    await counters.delete({ scope: 'login_origin', keyDigest: originKey() });
    for (const value of usernames)
      await counters.delete({
        scope: 'login_origin_account',
        keyDigest: pairKey(value),
      });
    await assertEmpty();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });

  it('allows exactly five concurrent reservations for an origin/account pair', async () => {
    const value = username();
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => limits.consume(address, value)),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(5);
    const failures = results.filter((result) => result.status === 'rejected');
    expect(failures).toHaveLength(7);
    for (const failure of failures)
      if (failure.status === 'rejected')
        expect(failure.reason).toBeInstanceOf(RateLimitException);
    const counter = await source
      .getRepository(AuthRateLimitEntity)
      .findOneByOrFail({
        scope: 'login_origin_account',
        keyDigest: pairKey(value),
      });
    expect(counter.attemptCount).toBe(5);
    expect(counter.blockedUntil).toEqual(counter.windowExpiresAt);
  });

  it('blocks an origin after 30 requests without creating unlimited new username counters', async () => {
    for (let index = 0; index < 30; index++)
      await limits.consume(address, username());
    for (let index = 0; index < 5; index++)
      await expect(limits.consume(address, username())).rejects.toBeInstanceOf(
        RateLimitException,
      );
    expect(await source.getRepository(AuthRateLimitEntity).count()).toBe(31);
  });

  it('starts a new window after expiration without permanently locking an account', async () => {
    const value = username();
    await limits.consume(address, value);
    const start = new Date(Date.now() - 16 * 60_000);
    const end = new Date(Date.now() - 60_000);
    const counters = source.getRepository(AuthRateLimitEntity);
    await counters.update(
      { scope: 'login_origin_account', keyDigest: pairKey(value) },
      {
        windowStartedAt: start,
        windowExpiresAt: end,
        attemptCount: 5,
        blockedUntil: end,
      },
    );
    await limits.consume(address, value);
    const counter = await counters.findOneByOrFail({
      scope: 'login_origin_account',
      keyDigest: pairKey(value),
    });
    expect(counter.attemptCount).toBe(1);
    expect(counter.blockedUntil).toBeNull();
    expect(counter.windowExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
