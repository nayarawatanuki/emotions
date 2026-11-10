import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import type {
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  QueryRunner,
} from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { readDatabaseEnvironment } from '../src/config/database-environment.js';
import { configureApp } from '../src/config/configure-app.js';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { initializeDataSource } from '../src/database/database.module.js';
import { AccountEntity } from '../src/modules/accounts/entities/account.entity.js';
import { ProfessionalEntity } from '../src/modules/professionals/entities/professional.entity.js';
import { AccountTokenEntity } from '../src/modules/auth/entities/account-token.entity.js';
import { AuthSessionEntity } from '../src/modules/auth/entities/auth-session.entity.js';
import { AuthRateLimitEntity } from '../src/modules/auth/entities/auth-rate-limit.entity.js';
import { PasswordService } from '../src/modules/auth/services/password.service.js';
import { PasswordCapacityService } from '../src/modules/auth/services/password-capacity.service.js';
import { ProfessionalOnboardingService } from '../src/modules/professionals/services/professional-onboarding.service.js';
import { databaseNow } from '../src/modules/auth/services/auth-time.js';
import {
  createSessionToken,
  sessionDigest,
  csrfToken,
} from '../src/modules/auth/security/session-tokens.js';
import {
  createOpaqueToken,
  opaqueTokenDigest,
} from '../src/modules/auth/security/opaque-tokens.js';
import type { ProfessionalInvitation } from '../src/modules/professionals/dto/professional-invitation.js';
import type { ActivationLink } from '../src/modules/auth/dto/activation-link.js';

const origin = 'http://127.0.0.1:3100';
const secret = '0123456789abcdef'.repeat(4);
const password = 'Synthetic professional first-access phrase 🎀';

describe('professional registration and first access on real MySQL with rollback', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let app: NestExpressApplication<Server>;
  let adminId: string;
  let adminSessionId: string;
  let adminToken: string;
  let professionalToken: string;
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
    hash = await new PasswordService().hash(password);
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
    app = fixture.createNestApplication<NestExpressApplication<Server>>({
      bodyParser: false,
    });
    app.useLogger(false);
    configureApp(app);
    await app.init();
  });
  beforeEach(async () => {
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    vi.spyOn(source, 'getRepository').mockImplementation(
      <Entity extends ObjectLiteral>(target: EntityTarget<Entity>) =>
        runner.manager.getRepository(target),
    );
    vi.spyOn(source, 'transaction').mockImplementation((async (
      first: unknown,
      second?: unknown,
    ) => {
      const callback = typeof first === 'function' ? first : second;
      if (typeof callback !== 'function')
        throw new Error('Missing transaction callback.');
      return runner.manager.transaction(
        callback as (manager: EntityManager) => Promise<unknown>,
      );
    }) as DataSource['transaction']);
    adminId = randomUUID();
    const existingProfessionalId = randomUUID();
    adminSessionId = randomUUID();
    await runner.manager.getRepository(AccountEntity).insert([
      {
        id: adminId,
        name: 'Synthetic inviter',
        username: 'fixture-admin',
        role: 'administrator',
        status: 'active',
        passwordHash: hash,
      },
      {
        id: existingProfessionalId,
        name: 'Synthetic existing professional',
        username: 'fixture-existing',
        role: 'professional',
        status: 'active',
        passwordHash: hash,
      },
    ]);
    await runner.manager.getRepository(ProfessionalEntity).insert({
      accountId: existingProfessionalId,
      createdByAccountId: adminId,
    });
    adminToken = createSessionToken();
    professionalToken = createSessionToken();
    const now = await databaseNow(runner.manager);
    await runner.manager.getRepository(AuthSessionEntity).insert([
      {
        id: adminSessionId,
        accountId: adminId,
        sessionDigest: sessionDigest(adminToken),
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
        idleExpiresAt: new Date(now.getTime() + 30 * 60_000),
        expiresAt: new Date(now.getTime() + 8 * 60 * 60_000),
      },
      {
        accountId: existingProfessionalId,
        sessionDigest: sessionDigest(professionalToken),
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
        idleExpiresAt: new Date(now.getTime() + 30 * 60_000),
        expiresAt: new Date(now.getTime() + 8 * 60 * 60_000),
      },
    ]);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
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
      if (app) await app.close();
      if (source?.isInitialized) await source.destroy();
    }
  });
  function adminPost(path: string, token = adminToken) {
    return request(app.getHttpServer())
      .post(path)
      .set('Cookie', `emotions_session_local=${token}`)
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .set('X-CSRF-Token', csrfToken(secret, token));
  }
  async function create(username = 'fixture-new') {
    const response = await adminPost('/professionals')
      .send({ name: ' Synthetic new professional ', username })
      .expect(201);
    return response.body as ProfessionalInvitation;
  }
  function token(link: ActivationLink) {
    const value = new URLSearchParams(new URL(link.url).hash.slice(1)).get(
      'token',
    );
    if (!value) throw new Error('Missing synthetic token');
    return value;
  }
  function activate(value: string, chosen = password) {
    return request(app.getHttpServer())
      .post('/auth/activate')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send({ token: value, password: chosen });
  }
  async function storedToken(value: string) {
    return runner.manager
      .getRepository(AccountTokenEntity)
      .findOneByOrFail({ tokenDigest: opaqueTokenDigest(value) });
  }
  async function storedAccount(id: string) {
    return runner.manager
      .getRepository(AccountEntity)
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.id = :id', { id })
      .getOneOrFail();
  }

  it('shares one password capacity provider between both modules', () =>
    expect(app.get(PasswordCapacityService, { each: true })).toHaveLength(1));

  it('creates account, profile and a 24-hour invitation without an initial password', async () => {
    const response = await adminPost('/professionals')
      .set('Host', 'untrusted.example')
      .send({ name: ' Synthetic new professional ', username: ' FIXTURE-NEW ' })
      .expect(201);
    const result = response.body as ProfessionalInvitation;
    const url = new URL(result.activation.url);
    expect(url.origin).toBe(origin);
    expect(url.pathname).toBe('/activate-account');
    expect(url.search).toBe('');
    expect(result.professional).toMatchObject({
      name: 'Synthetic new professional',
      username: 'fixture-new',
      status: 'pending',
    });
    const account = await storedAccount(result.professional.accountId);
    expect(account.passwordHash).toBeNull();
    expect(account.role).toBe('professional');
    expect(account.status).toBe('pending');
    expect(
      await runner.manager
        .getRepository(ProfessionalEntity)
        .findOneByOrFail({ id: result.professional.id }),
    ).toMatchObject({ accountId: account.id, createdByAccountId: adminId });
    const grant = await storedToken(token(result.activation));
    expect(grant.expiresAt.getTime() - grant.createdAt.getTime()).toBe(
      24 * 60 * 60_000,
    );
    expect(grant).not.toHaveProperty('tokenDigest');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('tokenDigest');
  });

  it('refuses registration by a professional or an unauthenticated caller', async () => {
    await adminPost('/professionals', professionalToken)
      .send({ name: 'Synthetic', username: 'fixture-new' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/professionals')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send({ name: 'Synthetic', username: 'fixture-new' })
      .expect(401);
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(2);
  });

  it('requires CSRF and a matching origin for administrator writes', async () => {
    await request(app.getHttpServer())
      .post('/professionals')
      .set('Cookie', `emotions_session_local=${adminToken}`)
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send({ name: 'Synthetic', username: 'fixture-new' })
      .expect(403);
    await adminPost('/professionals')
      .set('Origin', 'https://untrusted.example')
      .send({ name: 'Synthetic', username: 'fixture-new' })
      .expect(403);
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(2);
  });

  it('rejects a supplied role or password instead of creating an active account', async () => {
    await adminPost('/professionals')
      .send({
        name: 'Synthetic',
        username: 'fixture-new',
        role: 'administrator',
      })
      .expect(400);
    await adminPost('/professionals')
      .send({ name: 'Synthetic', username: 'fixture-new', password })
      .expect(400);
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(2);
  });

  it('returns conflict for a duplicate normalized username without partial records', async () => {
    const result = await adminPost('/professionals')
      .send({ name: 'Synthetic', username: ' FIXTURE-EXISTING ' })
      .expect(409);
    expect(result.body).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(2);
    expect(await runner.manager.getRepository(AccountTokenEntity).count()).toBe(
      0,
    );
  });

  it('activates only the invited account, consumes its token and permits normal login', async () => {
    const invitation = await create();
    const value = token(invitation.activation);
    const response = await activate(value).expect(204);
    expect(response.headers['set-cookie']).toBeUndefined();
    const account = await storedAccount(invitation.professional.accountId);
    expect(account.status).toBe('active');
    if (!account.passwordHash) throw new Error('Missing activated hash');
    expect(
      await new PasswordService().verify(password, account.passwordHash),
    ).toBe(true);
    expect(await storedToken(value)).toMatchObject({
      consumedAt: expect.any(Date),
      revokedAt: null,
    });
    expect(
      await runner.manager
        .getRepository(AuthSessionEntity)
        .countBy({ accountId: account.id }),
    ).toBe(0);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send({ username: invitation.professional.username, password })
      .expect(200);
  });

  it('refuses a consumed link without replacing the chosen password', async () => {
    const invitation = await create();
    const value = token(invitation.activation);
    await activate(value).expect(204);
    const first = (await storedAccount(invitation.professional.accountId))
      .passwordHash;
    await activate(value, 'A different synthetic password phrase').expect(400);
    expect(
      (await storedAccount(invitation.professional.accountId)).passwordHash,
    ).toBe(first);
  });

  it.each(['expired', 'revoked', 'wrong-purpose'] as const)(
    'refuses a %s token without activating the account',
    async (state) => {
      const invitation = await create();
      const value = token(invitation.activation);
      const grant = await storedToken(value);
      if (state === 'expired')
        await runner.manager
          .getRepository(AccountTokenEntity)
          .update(grant.id, {
            createdAt: new Date(Date.now() - 48 * 60 * 60_000),
            expiresAt: new Date(Date.now() - 60_000),
          });
      if (state === 'revoked')
        await runner.manager
          .getRepository(AccountTokenEntity)
          .update(grant.id, { revokedAt: new Date() });
      if (state === 'wrong-purpose')
        await runner.manager
          .getRepository(AccountTokenEntity)
          .update(grant.id, { purpose: 'password_reset' });
      const response = await activate(value).expect(400);
      expect(response.body).toEqual({
        error: { code: 'BAD_REQUEST', message: 'Requisição inválida.' },
      });
      expect(
        await storedAccount(invitation.professional.accountId),
      ).toMatchObject({ status: 'pending', passwordHash: null });
    },
  );

  it('invalidates the previous link when the ADM reissues an invitation', async () => {
    const invitation = await create();
    const old = token(invitation.activation);
    const response = await adminPost(
      `/professionals/${invitation.professional.id}/activation`,
    )
      .send({})
      .expect(201);
    const replacement = response.body as ActivationLink;
    expect(token(replacement)).not.toBe(old);
    expect((await storedToken(old)).revokedAt).toBeInstanceOf(Date);
    await activate(old).expect(400);
    await activate(token(replacement)).expect(204);
    expect(
      await runner.manager
        .getRepository(AccountTokenEntity)
        .countBy({ accountId: invitation.professional.accountId }),
    ).toBe(2);
  });

  it('does not reissue for an active account or an archived profile', async () => {
    const invitation = await create();
    await activate(token(invitation.activation)).expect(204);
    await adminPost(`/professionals/${invitation.professional.id}/activation`)
      .send({})
      .expect(409);
    const pending = await create('fixture-another');
    await runner.manager
      .getRepository(ProfessionalEntity)
      .update(pending.professional.id, { archivedAt: new Date() });
    await adminPost(`/professionals/${pending.professional.id}/activation`)
      .send({})
      .expect(409);
  });

  it.each([
    'archived',
    'suspended',
    'issuer-suspended',
    'already-active',
  ] as const)('rejects activation after state changes: %s', async (state) => {
    const invitation = await create();
    const value = token(invitation.activation);
    if (state === 'archived')
      await runner.manager
        .getRepository(ProfessionalEntity)
        .update(invitation.professional.id, { archivedAt: new Date() });
    if (state === 'suspended')
      await runner.manager
        .getRepository(AccountEntity)
        .update(invitation.professional.accountId, { status: 'suspended' });
    if (state === 'issuer-suspended')
      await runner.manager
        .getRepository(AccountEntity)
        .update(adminId, { status: 'suspended' });
    if (state === 'already-active')
      await runner.manager
        .getRepository(AccountEntity)
        .update(invitation.professional.accountId, {
          status: 'active',
          passwordHash: hash,
        });
    await activate(value, 'Another synthetic chosen password').expect(400);
    expect((await storedToken(value)).consumedAt).toBeNull();
  });

  it('revalidates the administrator session inside the registration transaction', async () => {
    const onboarding = app.get(ProfessionalOnboardingService);
    const original = onboarding.create.bind(onboarding);
    vi.spyOn(onboarding, 'create').mockImplementationOnce(
      async (input, context) => {
        await runner.manager
          .getRepository(AuthSessionEntity)
          .update(adminSessionId, { revokedAt: new Date() });
        return original(input, context);
      },
    );
    await adminPost('/professionals')
      .send({ name: 'Synthetic', username: 'fixture-new' })
      .expect(401);
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(2);
  });

  it('rolls back account and profile creation if issuing the token fails', async () => {
    vi.spyOn(
      runner.manager.getRepository(AccountTokenEntity),
      'insert',
    ).mockRejectedValueOnce(new Error('Synthetic private persistence failure'));
    const response = await adminPost('/professionals')
      .send({ name: 'Synthetic', username: 'fixture-new' })
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain('private persistence');
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(2);
    expect(await runner.manager.getRepository(ProfessionalEntity).count()).toBe(
      1,
    );
    expect(await runner.manager.getRepository(AccountTokenEntity).count()).toBe(
      0,
    );
  });

  it('rolls back the password and preserves the link when consuming the token fails', async () => {
    const invitation = await create();
    const value = token(invitation.activation);
    vi.spyOn(
      runner.manager.getRepository(AccountTokenEntity),
      'update',
    ).mockRejectedValueOnce(new Error('Synthetic token consumption failure'));
    await activate(value).expect(500);
    expect(
      await storedAccount(invitation.professional.accountId),
    ).toMatchObject({ status: 'pending', passwordHash: null });
    expect((await storedToken(value)).consumedAt).toBeNull();
    await activate(value).expect(204);
  });

  it('preserves the previous invitation if reissuing its replacement fails', async () => {
    const invitation = await create();
    const value = token(invitation.activation);
    vi.spyOn(
      runner.manager.getRepository(AccountTokenEntity),
      'insert',
    ).mockRejectedValueOnce(new Error('Synthetic replacement failure'));
    await adminPost(`/professionals/${invitation.professional.id}/activation`)
      .send({})
      .expect(500);
    expect((await storedToken(value)).revokedAt).toBeNull();
    expect(
      await runner.manager
        .getRepository(AccountTokenEntity)
        .countBy({ accountId: invitation.professional.accountId }),
    ).toBe(1);
    await activate(value).expect(204);
  });

  it('limits activation attempts independently from login and ignores forged forwarding headers', async () => {
    for (let index = 0; index < 10; index++)
      await activate(createOpaqueToken()).expect(400);
    const response = await request(app.getHttpServer())
      .post('/auth/activate')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .set('X-Forwarded-For', '198.51.100.90')
      .send({ token: createOpaqueToken(), password })
      .expect(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(
      await runner.manager.getRepository(AuthRateLimitEntity).count(),
    ).toBe(1);
  });

  it('does not allow cross-origin activation or GET consumption', async () => {
    const invitation = await create();
    const value = token(invitation.activation);
    await request(app.getHttpServer())
      .post('/auth/activate')
      .set('Origin', 'https://untrusted.example')
      .set('X-Emotions-Request', '1')
      .send({ token: value, password })
      .expect(403);
    await request(app.getHttpServer()).get('/auth/activate').expect(404);
    expect((await storedToken(value)).consumedAt).toBeNull();
  });

  it('validates identifiers and rejects unexpected fields on reissue', async () => {
    await adminPost('/professionals/not-a-uuid/activation')
      .send({})
      .expect(400);
    const invitation = await create();
    await adminPost(`/professionals/${invitation.professional.id}/activation`)
      .send({ password })
      .expect(400);
    await adminPost(`/professionals/${randomUUID()}/activation`)
      .send({})
      .expect(404);
    expect(
      (await storedToken(token(invitation.activation))).revokedAt,
    ).toBeNull();
  });
});
