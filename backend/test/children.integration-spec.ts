import { randomUUID } from 'node:crypto';
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
import { configureApp } from '../src/config/configure-app.js';
import { readDatabaseEnvironment } from '../src/config/database-environment.js';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { initializeDataSource } from '../src/database/database.module.js';
import { AccountEntity } from '../src/modules/accounts/entities/account.entity.js';
import { ProfessionalEntity } from '../src/modules/professionals/entities/professional.entity.js';
import { ChildEntity } from '../src/modules/children/entities/child.entity.js';
import { AuthSessionEntity } from '../src/modules/auth/entities/auth-session.entity.js';
import { PasswordService } from '../src/modules/auth/services/password.service.js';
import { ChildrenService } from '../src/modules/children/services/children.service.js';
import { databaseNow } from '../src/modules/auth/services/auth-time.js';
import {
  createSessionToken,
  sessionDigest,
  csrfToken,
} from '../src/modules/auth/security/session-tokens.js';
import type {
  ChildView,
  ChildDirectory,
} from '../src/modules/children/dto/child-view.js';

const origin = 'http://127.0.0.1:3100',
  secret = '0123456789abcdef'.repeat(4);
const input = {
  name: ' Synthetic child ',
  username: ' FIXTURE-CHILD ',
  dateOfBirth: '2020-02-29',
  guardianName: ' Synthetic guardian ',
  treatmentActive: true,
  reportedLevel: 'Informação sintética',
  notes: 'Synthetic notes\nsecond line',
};
describe('child records isolated by professional on real MySQL with rollback', () => {
  let source: DataSource,
    runner: QueryRunner,
    app: NestExpressApplication,
    hash: string;
  let firstAccount: string,
    secondAccount: string,
    firstProfile: string,
    secondProfile: string,
    firstSession: string;
  let tokens: { first: string; second: string; admin: string };
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
      throw Error('Requires isolated local development database');
    source = await initializeDataSource(createDatabaseOptions(environment));
    await assertEmpty();
    verifiedEmpty = true;
    hash = await new PasswordService().hash(
      'Synthetic children fixture phrase 🎀',
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
        throw Error('Missing transaction callback');
      return runner.manager.transaction(
        callback as (manager: EntityManager) => Promise<unknown>,
      );
    }) as DataSource['transaction']);
    firstAccount = randomUUID();
    secondAccount = randomUUID();
    const adminAccount = randomUUID();
    firstProfile = randomUUID();
    secondProfile = randomUUID();
    firstSession = randomUUID();
    await runner.manager.getRepository(AccountEntity).insert([
      {
        id: adminAccount,
        name: 'Synthetic administrator',
        username: 'fixture-child-admin',
        role: 'administrator',
        status: 'active',
        passwordHash: hash,
      },
      {
        id: firstAccount,
        name: 'Synthetic first professional',
        username: 'fixture-child-first',
        role: 'professional',
        status: 'active',
        passwordHash: hash,
      },
      {
        id: secondAccount,
        name: 'Synthetic second professional',
        username: 'fixture-child-second',
        role: 'professional',
        status: 'active',
        passwordHash: hash,
      },
    ]);
    await runner.manager.getRepository(ProfessionalEntity).insert([
      {
        id: firstProfile,
        accountId: firstAccount,
        createdByAccountId: adminAccount,
      },
      {
        id: secondProfile,
        accountId: secondAccount,
        createdByAccountId: adminAccount,
      },
    ]);
    tokens = {
      first: createSessionToken(),
      second: createSessionToken(),
      admin: createSessionToken(),
    };
    const now = await databaseNow(runner.manager);
    for (const [accountId, token, id] of [
      [firstAccount, tokens.first, firstSession],
      [secondAccount, tokens.second, randomUUID()],
      [adminAccount, tokens.admin, randomUUID()],
    ] as [string, string, string][])
      await runner.manager
        .getRepository(AuthSessionEntity)
        .insert({
          id,
          accountId,
          sessionDigest: sessionDigest(token),
          createdAt: now,
          updatedAt: now,
          lastSeenAt: now,
          idleExpiresAt: new Date(now.getTime() + 30 * 60_000),
          expiresAt: new Date(now.getTime() + 8 * 60 * 60_000),
        });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      if (runner?.isTransactionActive) await runner.rollbackTransaction();
    } finally {
      if (runner) await runner.release();
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
  function post(token = tokens.first) {
    return request(app.getHttpServer())
      .post('/children')
      .set('Cookie', `emotions_session_local=${token}`)
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .set('X-CSRF-Token', csrfToken(secret, token));
  }
  function get(path = '/children', token = tokens.first) {
    return request(app.getHttpServer())
      .get(path)
      .set('Cookie', `emotions_session_local=${token}`);
  }
  async function create(username = 'fixture-child', token = tokens.first) {
    const response = await post(token)
      .send({ ...input, username })
      .expect(201);
    return response.body as ChildView;
  }
  it('creates identity and child atomically with owner from session, civil date and no password', async () => {
    const response = await post().send(input).expect(201);
    const result = response.body as ChildView;
    expect(result).toEqual({
      ...input,
      id: expect.any(String),
      name: 'Synthetic child',
      username: 'fixture-child',
      guardianName: 'Synthetic guardian',
      archived: false,
    });
    const row = await runner.manager
      .getRepository(ChildEntity)
      .findOneByOrFail({ id: result.id });
    expect(row).toMatchObject({
      professionalId: firstProfile,
      dateOfBirth: '2020-02-29',
      photoFileId: null,
    });
    const account = await runner.manager
      .getRepository(AccountEntity)
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.id = :id', { id: row.accountId })
      .getOneOrFail();
    expect(account).toMatchObject({
      role: 'child',
      status: 'pending',
      passwordHash: null,
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(result)).not.toMatch(
      /password|accountId|professionalId|photoFileId/,
    );
  });
  it('lists and opens only children belonging to the signed-in professional', async () => {
    const own = await create('fixture-own');
    const other = await create('fixture-other', tokens.second);
    const response = await get().expect(200);
    const page = response.body as ChildDirectory;
    expect(page.items.map((item) => item.id)).toEqual([own.id]);
    expect(page.nextCursor).toBeNull();
    expect(Object.keys(page.items[0]!).sort()).toEqual([
      'archived',
      'dateOfBirth',
      'id',
      'name',
      'treatmentActive',
      'username',
    ]);
    expect(JSON.stringify(page)).not.toMatch(
      /guardianName|notes|reportedLevel/,
    );
    await get('/children/' + own.id)
      .expect(200)
      .expect(own);
    const hidden = await get('/children/' + other.id).expect(404);
    const absent = await get('/children/' + randomUUID()).expect(404);
    expect(hidden.body).toEqual(absent.body);
    await get('/children', tokens.second)
      .expect(200)
      .expect(({ body }) =>
        expect(body.items.map((item: { id: string }) => item.id)).toEqual([
          other.id,
        ]),
      );
  });
  it('does not grant clinical access to administrators or anonymous callers', async () => {
    const own = await create();
    await request(app.getHttpServer()).get('/children').expect(401);
    await get('/children', tokens.admin).expect(403);
    await get('/children/' + own.id, tokens.admin).expect(403);
    await post(tokens.admin).send(input).expect(403);
  });
  it('requires CSRF and same-origin writes and rejects cross-origin reads', async () => {
    await request(app.getHttpServer())
      .post('/children')
      .set('Cookie', `emotions_session_local=${tokens.first}`)
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send(input)
      .expect(403);
    await post()
      .set('Origin', 'https://untrusted.example')
      .send(input)
      .expect(403);
    await get().set('Origin', 'https://untrusted.example').expect(403);
    expect(await runner.manager.getRepository(ChildEntity).count()).toBe(0);
  });
  it.each(['professionalId', 'accountId', 'role', 'password', 'photoFileId'])(
    'rejects injected %s rather than accepting client ownership or credentials',
    async (field) => {
      await post()
        .send({ ...input, [field]: randomUUID() })
        .expect(400);
      expect(await runner.manager.getRepository(ChildEntity).count()).toBe(0);
    },
  );
  it('rejects future dates using database UTC and impossible dates before writes', async () => {
    await post()
      .send({ ...input, dateOfBirth: '9999-12-31' })
      .expect(400);
    await post()
      .send({ ...input, dateOfBirth: '2021-02-29' })
      .expect(400);
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(3);
  });
  it('returns conflict for normalized duplicate usernames without partial children', async () => {
    await create();
    await post(tokens.second)
      .send({ ...input, username: ' FIXTURE-CHILD ' })
      .expect(409);
    expect(await runner.manager.getRepository(ChildEntity).count()).toBe(1);
    await post()
      .send({ ...input, username: 'fixture-child-admin' })
      .expect(409);
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(4);
  });
  it('rolls back identity if inserting the child fails', async () => {
    const repository = runner.manager.getRepository(ChildEntity);
    vi.spyOn(repository, 'insert').mockRejectedValueOnce(
      Error('synthetic child insert failure'),
    );
    const response = await post().send(input).expect(500);
    expect(JSON.stringify(response.body)).not.toContain('synthetic');
    expect(await runner.manager.getRepository(AccountEntity).count()).toBe(3);
  });
  it.each(['suspended', 'archived', 'revoked'])(
    'revalidates %s state after the guard and before writing',
    async (change) => {
      const service = app.get(ChildrenService);
      const original = service.create.bind(service);
      vi.spyOn(service, 'create').mockImplementationOnce(
        async (context, body) => {
          if (change === 'suspended')
            await runner.manager
              .getRepository(AccountEntity)
              .update(firstAccount, { status: 'suspended' });
          else if (change === 'archived')
            await runner.manager
              .getRepository(ProfessionalEntity)
              .update(firstProfile, {
                archivedAt: await databaseNow(runner.manager),
              });
          else
            await runner.manager
              .getRepository(AuthSessionEntity)
              .update(firstSession, {
                revokedAt: await databaseNow(runner.manager),
              });
          return original(context, body);
        },
      );
      await post().send(input).expect(401);
      expect(await runner.manager.getRepository(ChildEntity).count()).toBe(0);
    },
  );
  it('enforces bounded cursor pagination without including another owner', async () => {
    const accounts = [];
    const children: {
      id: string;
      accountId: string;
      professionalId: string;
      dateOfBirth: string;
      guardianName: string;
      treatmentActive: boolean;
    }[] = [];
    let foreignId = '';
    for (let index = 0; index < 27; index++) {
      const accountId = randomUUID();
      accounts.push({
        id: accountId,
        name: `Synthetic page ${index}`,
        username: `fixture-child-page-${index}`,
        role: 'child' as const,
        status: 'pending' as const,
        passwordHash: null,
      });
      children.push({
        id: randomUUID(),
        accountId,
        professionalId: index === 26 ? secondProfile : firstProfile,
        dateOfBirth: '2020-02-29',
        guardianName: 'Synthetic guardian',
        treatmentActive: index % 2 === 0,
      });
    }
    foreignId = children.find(
      (child) => child.professionalId === secondProfile,
    )!.id;
    await runner.manager.getRepository(AccountEntity).insert(accounts);
    await runner.manager.getRepository(ChildEntity).insert(children);
    expect(
      (
        await runner.manager
          .getRepository(ChildEntity)
          .findOneByOrFail({ id: foreignId })
      ).professionalId,
    ).toBe(secondProfile);
    const first = await get().expect(200);
    expect(first.body.items).toHaveLength(25);
    const second = await get('/children?after=' + first.body.nextCursor).expect(
      200,
    );
    expect(second.body.items).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();
    expect(
      new Set(
        [...first.body.items, ...second.body.items].map(
          (item: { id: string }) => item.id,
        ),
      ).size,
    ).toBe(26);
    expect(
      [...first.body.items, ...second.body.items].some(
        (item: { id: string }) => item.id === foreignId,
      ),
    ).toBe(false);
  });
  it('rejects malformed UUIDs and query attempts to select another professional', async () => {
    for (const path of [
      '/children?professionalId=' + secondProfile,
      '/children?after=bad',
      '/children?after=a&after=b',
      '/children/not-a-uuid',
    ])
      await get(path).expect(400);
  });
});
