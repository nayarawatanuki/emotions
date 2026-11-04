import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { Controller, Get, Post } from '@nestjs/common';
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
import type { Response as TestResponse } from 'supertest';
import { AppModule } from '../src/app.module.js';
import { readDatabaseEnvironment } from '../src/config/database-environment.js';
import { configureApp } from '../src/config/configure-app.js';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { initializeDataSource } from '../src/database/database.module.js';
import { AccountEntity } from '../src/modules/accounts/entities/account.entity.js';
import { ProfessionalEntity } from '../src/modules/professionals/entities/professional.entity.js';
import { AuthSessionEntity } from '../src/modules/auth/entities/auth-session.entity.js';
import { AuthRateLimitEntity } from '../src/modules/auth/entities/auth-rate-limit.entity.js';
import { AllowedRoles } from '../src/modules/auth/decorators/access.decorator.js';
import { PasswordVerificationService } from '../src/modules/auth/services/password-verification.service.js';
import { PasswordService } from '../src/modules/auth/services/password.service.js';
import {
  createSessionToken,
  sessionDigest,
} from '../src/modules/auth/security/session-tokens.js';
import type { SessionView } from '../src/modules/auth/auth.types.js';

@Controller('access-test')
class AccessTestController {
  @AllowedRoles('administrator')
  @Get('admin')
  admin() {
    return { permitted: true };
  }
  @AllowedRoles('professional')
  @Get('professional')
  professional() {
    return { permitted: true };
  }
  @AllowedRoles('administrator')
  @Post('write')
  write() {
    return { permitted: true };
  }
  @Get('undeclared')
  undeclared() {
    return { permitted: true };
  }
}

const origin = 'http://127.0.0.1:3100';
const syntheticPassword = 'Synthetic adult phrase 🎀 2026';
const syntheticSecret = '0123456789abcdef'.repeat(4);

describe('adult authentication HTTP with real MySQL and rolled-back fixtures', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let app: NestExpressApplication<Server>;
  let adminId: string;
  let professionalId: string;
  let professionalAccountId: string;
  let passwordHash: string;
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
    passwordHash = await new PasswordService().hash(syntheticPassword);
    const fixture = await Test.createTestingModule({
      imports: [
        AppModule.register({
          ...process.env,
          NODE_ENV: 'test',
          AUTH_ENABLED: 'true',
          AUTH_ORIGIN: origin,
          AUTH_SECRET: syntheticSecret,
        }),
      ],
      controllers: [AccessTestController],
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
    // All production services use this real connection; their transactions become nested savepoints.
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
    const accounts = runner.manager.getRepository(AccountEntity);
    adminId = randomUUID();
    professionalAccountId = randomUUID();
    professionalId = randomUUID();
    await accounts.insert([
      {
        id: adminId,
        name: 'Synthetic ADM',
        username: 'fixture-admin',
        passwordHash,
        role: 'administrator',
        status: 'active',
      },
      {
        id: professionalAccountId,
        name: 'Synthetic professional',
        username: 'fixture-professional',
        passwordHash,
        role: 'professional',
        status: 'active',
      },
      {
        id: randomUUID(),
        name: 'Synthetic child',
        username: 'fixture-child',
        passwordHash,
        role: 'child',
        status: 'active',
      },
    ]);
    await runner.manager.getRepository(ProfessionalEntity).insert({
      id: professionalId,
      accountId: professionalAccountId,
      createdByAccountId: adminId,
    });
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

  async function login(
    username = 'fixture-admin',
    password = syntheticPassword,
    previous?: string,
  ) {
    const query = request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send({ username, password });
    if (previous) query.set('Cookie', previous);
    return query;
  }
  function cookie(response: TestResponse): string {
    const raw: unknown = response.headers['set-cookie'];
    if (!Array.isArray(raw) || typeof raw[0] !== 'string')
      throw new Error('Missing session cookie.');
    return raw[0].split(';')[0]!;
  }
  function view(response: TestResponse) {
    return response.body as SessionView;
  }
  async function storedSession(response: TestResponse) {
    const token = cookie(response).split('=')[1]!;
    return runner.manager
      .getRepository(AuthSessionEntity)
      .findOneByOrFail({ sessionDigest: sessionDigest(token) });
  }

  it('logs in an administrator with an opaque HttpOnly cookie and minimal identity', async () => {
    const response = await login();
    expect(response.status).toBe(200);
    expect(view(response).user).toEqual({
      id: adminId,
      name: 'Synthetic ADM',
      role: 'administrator',
    });
    expect(Object.keys(response.body as object).sort()).toEqual([
      'csrfToken',
      'expiresAt',
      'idleExpiresAt',
      'user',
    ]);
    expect(cookie(response)).toMatch(
      /^emotions_session_local=[A-Za-z0-9_-]{43}$/,
    );
    expect(response.headers['set-cookie']).toEqual([
      expect.stringContaining('HttpOnly'),
    ]);
    const session = await storedSession(response);
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(
      8 * 60 * 60_000,
    );
    expect(session.idleExpiresAt.getTime() - session.createdAt.getTime()).toBe(
      30 * 60_000,
    );
    expect(session).not.toHaveProperty('sessionDigest');
    expect(
      (
        await runner.manager
          .getRepository(AccountEntity)
          .findOneByOrFail({ id: adminId })
      ).lastSignedInAt,
    ).toBeInstanceOf(Date);
    expect(JSON.stringify(response.body)).not.toContain(passwordHash);
    expect(JSON.stringify(response.body)).not.toContain(
      cookie(response).split('=')[1],
    );
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('permits professionals but restricts administrator routes and undeclared routes', async () => {
    const professional = await login('fixture-professional');
    expect(professional.status).toBe(200);
    await request(app.getHttpServer())
      .get('/access-test/admin')
      .set('Cookie', cookie(professional))
      .expect(403);
    await request(app.getHttpServer())
      .get('/access-test/undeclared')
      .set('Cookie', cookie(professional))
      .expect(403);
    const admin = await login();
    await request(app.getHttpServer())
      .get('/access-test/admin')
      .set('Cookie', cookie(admin))
      .expect(200);
    await request(app.getHttpServer())
      .get('/access-test/professional')
      .set('Cookie', cookie(admin))
      .expect(403);
  });

  it('returns the same public failure for nonexistent accounts, wrong passwords and children', async () => {
    const missing = await login('fixture-missing');
    const wrong = await login(
      'fixture-admin',
      'Another synthetic adult phrase',
    );
    const child = await login('fixture-child');
    expect([missing.status, wrong.status, child.status]).toEqual([
      401, 401, 401,
    ]);
    expect(missing.body).toEqual(wrong.body);
    expect(child.body).toEqual(wrong.body);
    expect(await runner.manager.getRepository(AuthSessionEntity).count()).toBe(
      0,
    );
  });

  it.each(['pending', 'suspended'] as const)(
    'rejects a %s account with the same public login failure',
    async (status) => {
      await runner.manager
        .getRepository(AccountEntity)
        .update(adminId, { status });
      const response = await login();
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária.' },
      });
    },
  );

  it('refuses archived professionals even with the correct password', async () => {
    await runner.manager
      .getRepository(ProfessionalEntity)
      .update(professionalId, { archivedAt: new Date() });
    expect((await login('fixture-professional')).status).toBe(401);
  });

  it('rechecks account status after the expensive password verification', async () => {
    const verifier = app.get(PasswordVerificationService);
    const original = verifier.verify.bind(verifier);
    vi.spyOn(verifier, 'verify').mockImplementationOnce(
      async (password, stored) => {
        const result = await original(password, stored);
        await runner.manager
          .getRepository(AccountEntity)
          .update(adminId, { status: 'suspended' });
        return result;
      },
    );
    expect((await login()).status).toBe(401);
    expect(await runner.manager.getRepository(AuthSessionEntity).count()).toBe(
      0,
    );
  });

  it('treats a corrupt stored hash as a generic failed login', async () => {
    await runner.manager
      .getRepository(AccountEntity)
      .update(adminId, { passwordHash: 'synthetic-malformed-hash' });
    expect((await login()).status).toBe(401);
    expect(await runner.manager.getRepository(AuthSessionEntity).count()).toBe(
      0,
    );
  });

  it('rotates the identifier on a new login and revokes the old cookie', async () => {
    const first = await login();
    const second = await login(
      'fixture-admin',
      syntheticPassword,
      cookie(first),
    );
    expect(cookie(first)).not.toBe(cookie(second));
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', cookie(first))
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', cookie(second))
      .expect(200);
  });

  it('refuses forged sessions and rejects ambiguous duplicate cookies', async () => {
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', `emotions_session_local=${createSessionToken()}`)
      .expect(401);
    const response = await login();
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', `${cookie(response)}; ${cookie(response)}`)
      .expect(400);
  });

  it.each(['idle', 'absolute'] as const)(
    'revokes a session that reached its %s expiry',
    async (kind) => {
      const response = await login();
      const session = await storedSession(response);
      const start = new Date(Date.now() - 9 * 60 * 60_000);
      const expiry = new Date(Date.now() - 60_000);
      await runner.manager.getRepository(AuthSessionEntity).update(session.id, {
        createdAt: start,
        lastSeenAt: start,
        idleExpiresAt: expiry,
        ...(kind === 'absolute' ? { expiresAt: expiry } : {}),
      });
      await request(app.getHttpServer())
        .get('/auth/session')
        .set('Cookie', cookie(response))
        .expect(401);
      expect(
        (
          await runner.manager
            .getRepository(AuthSessionEntity)
            .findOneByOrFail({ id: session.id })
        ).revokedAt,
      ).toBeInstanceOf(Date);
    },
  );

  it('extends idle expiry while preserving the absolute deadline', async () => {
    const response = await login();
    const session = await storedSession(response);
    await runner.manager
      .getRepository(AuthSessionEntity)
      .update(session.id, { idleExpiresAt: new Date(Date.now() + 5 * 60_000) });
    await request(app.getHttpServer())
      .post('/access-test/write')
      .set('Cookie', cookie(response))
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .set('X-CSRF-Token', view(response).csrfToken)
      .send({})
      .expect(201);
    const renewed = await storedSession(response);
    expect(renewed.idleExpiresAt.getTime()).toBeGreaterThan(
      Date.now() + 25 * 60_000,
    );
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await runner.manager
      .getRepository(AuthSessionEntity)
      .update(session.id, { expiresAt, idleExpiresAt: expiresAt });
    const read = await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', cookie(response))
      .expect(200);
    expect(view(read).expiresAt).toBe(expiresAt.toISOString());
    expect(view(read).idleExpiresAt).toBe(expiresAt.toISOString());
  });

  it.each(['suspend', 'archive'] as const)(
    'invalidates an existing professional session after %s',
    async (operation) => {
      const response = await login('fixture-professional');
      if (operation === 'suspend')
        await runner.manager
          .getRepository(AccountEntity)
          .update(professionalAccountId, { status: 'suspended' });
      else
        await runner.manager
          .getRepository(ProfessionalEntity)
          .update(professionalId, { archivedAt: new Date() });
      await request(app.getHttpServer())
        .get('/auth/session')
        .set('Cookie', cookie(response))
        .expect(401);
      expect((await storedSession(response)).revokedAt).toBeInstanceOf(Date);
    },
  );

  it('requires bound CSRF and revokes the session on logout', async () => {
    const response = await login();
    const currentCookie = cookie(response);
    const base = () =>
      request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', currentCookie)
        .set('Origin', origin)
        .set('X-Emotions-Request', '1');
    await base().send({}).expect(403);
    await base().set('X-CSRF-Token', createSessionToken()).send({}).expect(403);
    const logout = await base()
      .set('X-CSRF-Token', view(response).csrfToken)
      .send({})
      .expect(204);
    expect(logout.headers['set-cookie']).toEqual([
      expect.stringContaining('Expires=Thu, 01 Jan 1970'),
    ]);
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', currentCookie)
      .expect(401);
  });

  it('refuses CSRF copied from another valid session', async () => {
    const first = await login();
    const second = await login();
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie(second))
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .set('X-CSRF-Token', view(first).csrfToken)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', cookie(second))
      .expect(200);
  });

  it('rejects cross-origin login, simple forms and missing custom headers before persistence', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'https://evil.example')
      .set('X-Emotions-Request', '1')
      .send({ username: 'fixture-admin', password: syntheticPassword })
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .send({ username: 'fixture-admin', password: syntheticPassword })
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .type('form')
      .send({ username: 'fixture-admin', password: syntheticPassword })
      .expect(415);
    expect(
      await runner.manager.getRepository(AuthRateLimitEntity).count(),
    ).toBe(0);
  });

  it('rejects unexpected fields and never accepts a supplied role', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send({
        username: 'fixture-professional',
        password: syntheticPassword,
        role: 'administrator',
      })
      .expect(400);
    expect(
      await runner.manager.getRepository(AuthRateLimitEntity).count(),
    ).toBe(0);
  });

  it('returns 429 after five requests and ignores forged forwarding headers', async () => {
    for (let index = 0; index < 5; index++)
      expect((await login('fixture-missing')).status).toBe(401);
    const blocked = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .set('X-Forwarded-For', '198.51.100.89')
      .send({ username: 'fixture-missing', password: syntheticPassword })
      .expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('keeps health public while authentication is enabled', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
