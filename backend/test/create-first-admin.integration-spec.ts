import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import { readDatabaseEnvironment } from '../src/config/database-environment.js';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { initializeDataSource } from '../src/database/database.module.js';
import { AccountEntity } from '../src/modules/accounts/entities/account.entity.js';
import {
  CreateFirstAdminService,
  firstAdminCreationLockName,
} from '../src/modules/accounts/services/create-first-admin.service.js';
import { PasswordService } from '../src/modules/auth/services/password.service.js';

describe('first administrator creation on real MySQL with rolled-back fixtures', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let verifiedEmpty = false;
  const tables = [
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
  const input = {
    name: 'Synthetic Admin',
    username: 'synthetic-admin',
    password: 'Synthetic first administrator phrase 🎀',
  };
  const service = new CreateFirstAdminService();

  async function assertEmpty() {
    for (const table of tables) {
      const rows: unknown = await source.query(
        `SELECT COUNT(*) AS total FROM \`${table}\``,
      );
      expect(rows).toEqual([{ total: '0' }]);
    }
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

  it('persists a verifiable hash, keeps it hidden in default selects, and never replaces the first administrator', async () => {
    // The service commits a nested savepoint; the enclosing fixture transaction is always rolled back.
    await service.create(runner, input);
    const accounts = runner.manager.getRepository(AccountEntity);
    const visible = await accounts.findOneByOrFail({ role: 'administrator' });
    expect(visible.status).toBe('active');
    expect(visible.passwordHash).toBeUndefined();
    const stored = await accounts
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.id = :id', { id: visible.id })
      .getOneOrFail();
    if (stored.passwordHash === null)
      throw new Error('Missing fixture password hash.');
    expect(
      await new PasswordService().verify(input.password, stored.passwordHash),
    ).toBe(true);
    await expect(
      service.create(runner, { ...input, username: 'other-synthetic' }),
    ).rejects.toThrow('Já existe um ADM');
    expect(await accounts.count()).toBe(1);
    expect(runner.isTransactionActive).toBe(true);
  });

  it.each(['pending', 'suspended'] as const)(
    'refuses an existing %s administrator',
    async (status) => {
      await runner.manager.getRepository(AccountEntity).insert({
        id: randomUUID(),
        ...input,
        passwordHash: 'synthetic-only-not-a-credential',
        role: 'administrator',
        status,
      });
      await expect(service.create(runner, input)).rejects.toThrow(
        'Já existe um ADM',
      );
      expect(await runner.manager.getRepository(AccountEntity).count()).toBe(1);
    },
  );

  it('refuses the operation while another connection owns the same first administrator creation lock', async () => {
    const other = source.createQueryRunner();
    const lock = firstAdminCreationLockName('emotions_development');
    try {
      await other.connect();
      expect(
        await other.query('SELECT GET_LOCK(?, 0) AS acquired', [lock]),
      ).toEqual([{ acquired: '1' }]);
      await expect(service.create(runner, input)).rejects.toThrow(
        'em andamento',
      );
      expect(await runner.manager.getRepository(AccountEntity).count()).toBe(0);
    } finally {
      try {
        await other.query('SELECT RELEASE_LOCK(?)', [lock]);
      } finally {
        await other.release();
      }
    }
  });
});
