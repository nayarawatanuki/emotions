import { StoredFileEntity } from '../src/modules/files/entities/stored-file.entity.js';
import { ActivityEntity } from '../src/modules/activities/entities/activity.entity.js';
import { ActivityOptionEntity } from '../src/modules/activities/entities/activity-option.entity.js';
import { RewardEntity } from '../src/modules/activities/entities/reward.entity.js';
import { ActivityResultEntity } from '../src/modules/results/entities/activity-result.entity.js';
import { ActivityAttemptEntity } from '../src/modules/results/entities/activity-attempt.entity.js';
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
      await runner.manager.getRepository(AuthSessionEntity).insert({
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
      revision: expect.stringMatching(/^[a-f0-9]{64}$/),
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
  it.each([false, true])(
    'enforces bounded cursor pagination without including another owner (archived=%s)',
    async (archived) => {
      const accounts = [];
      const children: {
        id: string;
        accountId: string;
        professionalId: string;
        dateOfBirth: string;
        guardianName: string;
        treatmentActive: boolean;
        archivedAt: Date | null;
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
          archivedAt: archived ? new Date() : null,
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
      const filter = archived ? 'archived=true&' : '';
      const first = await get(
        archived ? '/children?archived=true' : '/children',
      ).expect(200);
      expect(first.body.items).toHaveLength(25);
      const second = await get(
        '/children?' + filter + 'after=' + first.body.nextCursor,
      ).expect(200);
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
    },
  );

  function patch(id: string, body: object, token = tokens.first) {
    return request(app.getHttpServer())
      .patch('/children/' + id)
      .set('Cookie', `emotions_session_local=${token}`)
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .set('X-CSRF-Token', csrfToken(secret, token))
      .send(body);
  }
  function editBody(child: ChildView) {
    return {
      ...input,
      name: child.name,
      username: child.username,
      revision: child.revision,
    };
  }
  it('updates the owned identity and clinical fields atomically with a fresh revision', async () => {
    const child = await create();
    const body = {
      ...editBody(child),
      name: 'Updated synthetic name',
      username: 'fixture-updated-child',
      guardianName: 'Updated guardian',
      notes: 'Updated notes',
      treatmentActive: false,
    };
    const response = await patch(child.id, body).expect(200);
    const updated = response.body as ChildView;
    expect(updated).toMatchObject({
      name: body.name,
      username: body.username,
      guardianName: body.guardianName,
      notes: body.notes,
      treatmentActive: false,
    });
    expect(updated.revision).not.toBe(child.revision);
    await get('/children/' + child.id)
      .expect(200)
      .expect(updated);
    const row = await runner.manager
      .getRepository(ChildEntity)
      .findOneByOrFail({ id: child.id });
    expect(row.professionalId).toBe(firstProfile);
    const account = await runner.manager
      .getRepository(AccountEntity)
      .findOneByOrFail({ id: row.accountId });
    expect(account).toMatchObject({ role: 'child', status: 'pending' });
  });
  it('refuses a stale edit without overwriting the first saved changes', async () => {
    const child = await create();
    const body = editBody(child);
    await patch(child.id, { ...body, notes: 'First saved revision' }).expect(
      200,
    );
    await patch(child.id, { ...body, notes: 'Stale second writer' }).expect(
      409,
    );
    expect((await get('/children/' + child.id)).body.notes).toBe(
      'First saved revision',
    );
  });
  it('does not allow update by another professional, administrator or visitor', async () => {
    const child = await create();
    const body = editBody(child);
    const foreign = await patch(child.id, body, tokens.second).expect(404);
    const absent = await patch(randomUUID(), body, tokens.second).expect(404);
    expect(foreign.body).toEqual(absent.body);
    await patch(child.id, body, tokens.admin).expect(403);
    await request(app.getHttpServer())
      .patch('/children/' + child.id)
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send(body)
      .expect(401);
  });
  it('requires CSRF and origin on PATCH, not just on registration', async () => {
    const child = await create();
    const body = editBody(child);
    await request(app.getHttpServer())
      .patch('/children/' + child.id)
      .set('Cookie', `emotions_session_local=${tokens.first}`)
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .patch('/children/' + child.id)
      .set('Cookie', `emotions_session_local=${tokens.first}`)
      .set('Origin', 'https://untrusted.example')
      .set('X-Emotions-Request', '1')
      .set('X-CSRF-Token', csrfToken(secret, tokens.first))
      .send(body)
      .expect(403);
  });
  it('rejects archive, credential or ownership changes and future dates', async () => {
    const child = await create();
    for (const field of [
      'professionalId',
      'password',
      'status',
      'archivedAt',
      'photoFileId',
    ])
      await patch(child.id, { ...editBody(child), [field]: 'forged' }).expect(
        400,
      );
    await patch(child.id, {
      ...editBody(child),
      dateOfBirth: '9999-12-31',
    }).expect(400);
  });
  it('keeps both identity and child unchanged if the second update fails', async () => {
    const child = await create();
    vi.spyOn(
      runner.manager.getRepository(ChildEntity),
      'update',
    ).mockRejectedValueOnce(Error('synthetic update failure'));
    await patch(child.id, {
      ...editBody(child),
      name: 'Must roll back',
      notes: 'Must roll back',
    }).expect(500);
    await get('/children/' + child.id)
      .expect(200)
      .expect(child);
  });
  it('rejects username collision and archived children without changing records', async () => {
    const child = await create();
    await patch(child.id, {
      ...editBody(child),
      username: 'fixture-child-admin',
    }).expect(409);
    await runner.manager
      .getRepository(ChildEntity)
      .update(child.id, { archivedAt: await databaseNow(runner.manager) });
    await patch(child.id, editBody(child)).expect(409);
  });
  it.each(['suspended', 'archived', 'revoked'])(
    'revalidates %s state after the update guard',
    async (change) => {
      const child = await create();
      const service = app.get(ChildrenService);
      const original = service.update.bind(service);
      vi.spyOn(service, 'update').mockImplementationOnce(
        async (context, id, body) => {
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
          return original(context, id, body);
        },
      );
      await patch(child.id, {
        ...editBody(child),
        notes: 'Must not save',
      }).expect(change === 'archived' ? 404 : 401);
      expect(
        (
          await runner.manager
            .getRepository(ChildEntity)
            .findOneByOrFail({ id: child.id })
        ).notes,
      ).toBe(input.notes);
    },
  );
  it('rejects malformed UUIDs and query attempts to select another professional', async () => {
    for (const path of [
      '/children?professionalId=' + secondProfile,
      '/children?after=bad',
      '/children?after=a&after=b',
      '/children/not-a-uuid',
    ])
      await get(path).expect(400);
  });
  function archive(child: ChildView, archived = true, token = tokens.first) {
    return patch(
      child.id + '/archive',
      { archived, revision: child.revision },
      token,
    );
  }
  it('archives reversibly, keeps clinical fields and pending identity, filters both directories', async () => {
    const child = await create();
    const other = await create('fixture-child-other', tokens.second);
    await archive(other, true, tokens.second).expect(200);
    const response = await archive(child).expect(200);
    const archived = response.body as ChildView;
    expect(archived).toEqual({
      ...child,
      archived: true,
      revision: expect.any(String),
    });
    expect(archived.revision).not.toBe(child.revision);
    expect((await get().expect(200)).body.items).toEqual([]);
    expect(
      (await get('/children?archived=false').expect(200)).body.items,
    ).toEqual([]);
    expect(
      (await get('/children?archived=true').expect(200)).body.items.map(
        (row: { id: string }) => row.id,
      ),
    ).toEqual([child.id]);
    await get('/children/' + child.id)
      .expect(200)
      .expect(archived);
    await patch(child.id, editBody(archived)).expect(409);
    await archive(archived).expect(409);
    await archive(child, false).expect(409);
    const restored = (await archive(archived, false).expect(200))
      .body as ChildView;
    expect(restored).toEqual({ ...child, revision: expect.any(String) });
    expect((await get('/children?archived=true')).body.items).toEqual([]);
    expect((await get()).body.items[0].id).toBe(child.id);
    const row = await runner.manager
      .getRepository(ChildEntity)
      .findOneByOrFail({ id: child.id });
    expect(
      await runner.manager
        .getRepository(AccountEntity)
        .findOneByOrFail({ id: row.accountId }),
    ).toMatchObject({ status: 'pending', role: 'child' });
    await patch(child.id, editBody(restored)).expect(200);
  });
  it('does not allow archive by other owners, ADM or anonymous visitors', async () => {
    const child = await create();
    const foreign = await archive(child, true, tokens.second).expect(404);
    const absent = await archive(
      { ...child, id: randomUUID() },
      true,
      tokens.second,
    ).expect(404);
    expect(foreign.body).toEqual(absent.body);
    await archive(child, true, tokens.admin).expect(403);
    await request(app.getHttpServer())
      .patch('/children/' + child.id + '/archive')
      .set('Origin', origin)
      .set('X-Emotions-Request', '1')
      .send({ archived: true, revision: child.revision })
      .expect(401);
    await get('/children?archived=true', tokens.admin).expect(403);
  });
  it('requires archive origin/CSRF and rejects privileged bodies and malformed filters', async () => {
    const child = await create();
    const path = '/children/' + child.id + '/archive';
    for (const hostile of [false, true]) {
      const call = request(app.getHttpServer())
        .patch(path)
        .set('Cookie', `emotions_session_local=${tokens.first}`)
        .set('Origin', hostile ? 'https://untrusted.example' : origin)
        .set('X-Emotions-Request', '1');
      if (hostile) call.set('X-CSRF-Token', csrfToken(secret, tokens.first));
      await call.send({ archived: true, revision: child.revision }).expect(403);
    }
    for (const body of [
      { archived: 'true', revision: child.revision },
      { archived: true, revision: child.revision, status: 'active' },
      { archived: true },
    ])
      await patch(child.id + '/archive', body).expect(400);
    for (const query of [
      'archived=all',
      'archived=true&archived=false',
      'archived=',
      'archived=true&after=bad',
    ])
      await get('/children?' + query).expect(400);
  });
  it('suspends active child access, revokes its sessions, and never revives access on restore', async () => {
    const child = await create();
    const row = await runner.manager
      .getRepository(ChildEntity)
      .findOneByOrFail({ id: child.id });
    await runner.manager
      .getRepository(AccountEntity)
      .update(row.accountId, { status: 'active', passwordHash: hash });
    const now = await databaseNow(runner.manager);
    const sessionId = randomUUID();
    await runner.manager.getRepository(AuthSessionEntity).insert({
      id: sessionId,
      accountId: row.accountId,
      sessionDigest: sessionDigest(createSessionToken()),
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      idleExpiresAt: new Date(now.getTime() + 60000),
      expiresAt: new Date(now.getTime() + 120000),
    });
    const current = (await get('/children/' + child.id)).body as ChildView;
    const archived = (await archive(current).expect(200)).body as ChildView;
    const accounts = runner.manager.getRepository(AccountEntity);
    expect((await accounts.findOneByOrFail({ id: row.accountId })).status).toBe(
      'suspended',
    );
    expect(
      (
        await runner.manager
          .getRepository(AuthSessionEntity)
          .findOneByOrFail({ id: sessionId })
      ).revokedAt,
    ).not.toBeNull();
    await archive(archived, false).expect(200);
    expect((await accounts.findOneByOrFail({ id: row.accountId })).status).toBe(
      'suspended',
    );
    expect(
      (
        await runner.manager
          .getRepository(AuthSessionEntity)
          .findOneByOrFail({ id: sessionId })
      ).revokedAt,
    ).not.toBeNull();
  });
  it('rolls back access suspension and session revocation if the archive write fails', async () => {
    const child = await create();
    const row = await runner.manager
      .getRepository(ChildEntity)
      .findOneByOrFail({ id: child.id });
    await runner.manager
      .getRepository(AccountEntity)
      .update(row.accountId, { status: 'active', passwordHash: hash });
    const now = await databaseNow(runner.manager);
    const sessionId = randomUUID();
    await runner.manager.getRepository(AuthSessionEntity).insert({
      id: sessionId,
      accountId: row.accountId,
      sessionDigest: sessionDigest(createSessionToken()),
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      idleExpiresAt: new Date(now.getTime() + 60000),
      expiresAt: new Date(now.getTime() + 120000),
    });
    const current = (await get('/children/' + child.id)).body as ChildView;
    vi.spyOn(
      runner.manager.getRepository(ChildEntity),
      'update',
    ).mockRejectedValueOnce(Error('synthetic archive failure'));
    await archive(current).expect(500);
    expect(
      (
        await runner.manager
          .getRepository(AccountEntity)
          .findOneByOrFail({ id: row.accountId })
      ).status,
    ).toBe('active');
    expect(
      (
        await runner.manager
          .getRepository(AuthSessionEntity)
          .findOneByOrFail({ id: sessionId })
      ).revokedAt,
    ).toBeNull();
    await get('/children/' + child.id)
      .expect(200)
      .expect(current);
  });
  it.each(['suspended', 'archived', 'revoked'])(
    'revalidates professional %s after archive guard',
    async (change) => {
      const child = await create();
      const service = app.get(ChildrenService);
      const original = service.setArchived.bind(service);
      vi.spyOn(service, 'setArchived').mockImplementationOnce(
        async (context, id, body) => {
          const now = await databaseNow(runner.manager);
          if (change === 'suspended')
            await runner.manager
              .getRepository(AccountEntity)
              .update(firstAccount, { status: 'suspended' });
          else if (change === 'archived')
            await runner.manager
              .getRepository(ProfessionalEntity)
              .update(firstProfile, { archivedAt: now });
          else
            await runner.manager
              .getRepository(AuthSessionEntity)
              .update(firstSession, { revokedAt: now });
          return original(context, id, body);
        },
      );
      await archive(child).expect(change === 'archived' ? 404 : 401);
      expect(
        (
          await runner.manager
            .getRepository(ChildEntity)
            .findOneByOrFail({ id: child.id })
        ).archivedAt,
      ).toBeNull();
    },
  );
  it('preserves photos, activities, alternatives, reward, result and timed attempt across archive/restore', async () => {
    const child = await create();
    const manager = runner.manager;
    const fileId = randomUUID(),
      activityId = randomUUID(),
      optionId = randomUUID(),
      resultId = randomUUID();
    await manager
      .getRepository(StoredFileEntity)
      .insert({
        id: fileId,
        professionalId: firstProfile,
        storageKey: 'fixture/' + fileId,
        mediaType: 'image/png',
        sizeBytes: '1',
      });
    await manager
      .getRepository(ChildEntity)
      .update(child.id, { photoFileId: fileId });
    await manager
      .getRepository(ActivityEntity)
      .insert({
        id: activityId,
        childId: child.id,
        professionalId: firstProfile,
        name: 'Synthetic activity',
        emotion: 'Joy',
        imageFileId: fileId,
      });
    await manager
      .getRepository(ActivityOptionEntity)
      .insert({
        id: optionId,
        activityId,
        position: 1,
        label: 'Synthetic option',
        isCorrect: true,
      });
    await manager
      .getRepository(RewardEntity)
      .insert({
        id: randomUUID(),
        activityId,
        professionalId: firstProfile,
        imageFileId: fileId,
        message: 'Synthetic reward',
      });
    const startedAt = new Date('2026-01-01T12:00:00Z'),
      answeredAt = new Date('2026-01-01T12:00:01Z');
    await manager
      .getRepository(ActivityResultEntity)
      .insert({
        id: resultId,
        activityId,
        professionalId: firstProfile,
        sequence: 1,
        status: 'completed',
        outcome: 'correct',
        startedAt,
        completedAt: answeredAt,
      });
    await manager
      .getRepository(ActivityAttemptEntity)
      .insert({
        id: randomUUID(),
        resultId,
        activityId,
        selectedOptionId: optionId,
        attemptNumber: 1,
        operationId: randomUUID(),
        startedAt,
        answeredAt,
        durationSeconds: '1',
        timingSource: 'server_elapsed',
        isCorrect: true,
      });
    const tables = [
      'files',
      'activities',
      'activity_options',
      'rewards',
      'activity_results',
      'activity_attempts',
    ] as const;
    const before = await Promise.all(
      tables.map((table) =>
        runner.query(`SELECT * FROM \`${table}\` ORDER BY id`),
      ),
    );
    const current = (await get('/children/' + child.id)).body as ChildView;
    const archived = (await archive(current).expect(200)).body as ChildView;
    await archive(archived, false).expect(200);
    const after = await Promise.all(
      tables.map((table) =>
        runner.query(`SELECT * FROM \`${table}\` ORDER BY id`),
      ),
    );
    expect(after).toEqual(before);
    expect(
      (
        await manager
          .getRepository(ChildEntity)
          .findOneByOrFail({ id: child.id })
      ).photoFileId,
    ).toBe(fileId);
  });
});
