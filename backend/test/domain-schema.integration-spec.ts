import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import { readDatabaseEnvironment } from '../src/config/database-environment.js';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { initializeDataSource } from '../src/database/database.module.js';
import { AccountEntity } from '../src/modules/accounts/entities/account.entity.js';
import { StoredFileEntity } from '../src/modules/files/entities/stored-file.entity.js';
import { ChildEntity } from '../src/modules/children/entities/child.entity.js';
import {
  acquireMigrationLock,
  migrationLockName,
} from '../src/database/migration-lock.js';

const domainTables = [
  'accounts',
  'professionals',
  'files',
  'children',
  'activities',
  'activity_options',
  'rewards',
  'activity_results',
  'activity_attempts',
] as const;
type DomainTable = (typeof domainTables)[number];
const startedAt = new Date('2026-01-01T12:00:00.000Z');
const answeredAt = new Date('2026-01-01T12:00:01.000Z');

describe('domain constraints on real MySQL', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let fixtures: Awaited<ReturnType<typeof createFixtures>>;
  let verifiedEmpty = false;

  // SQL identifiers come only from this test's literal table/column definitions;
  // all fixture values are bound parameters. No files or legacy data are accessed.
  async function insert(
    table: DomainTable,
    values: Record<string, unknown>,
  ): Promise<string> {
    const id = randomUUID();
    const row = { id, ...values };
    const columns = Object.keys(row);
    await runner.query(
      `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      Object.values(row),
    );
    return id;
  }

  async function account(
    role: 'administrator' | 'professional' | 'child',
  ): Promise<string> {
    return insert('accounts', {
      name: 'Synthetic schema fixture',
      username: `fixture_${randomUUID()}`,
      password_hash: 'fixture-only-not-a-login-credential',
      role,
    });
  }

  async function createFixtures() {
    const admin = await account('administrator');
    const professionalAccountA = await account('professional');
    const professionalAccountB = await account('professional');
    const professionalA = await insert('professionals', {
      account_id: professionalAccountA,
      created_by_account_id: admin,
    });
    const professionalB = await insert('professionals', {
      account_id: professionalAccountB,
      created_by_account_id: admin,
    });
    const childAccountA = await account('child');
    const childAccountB = await account('child');
    const fileA = await insert('files', {
      professional_id: professionalA,
      storage_key: `fixture/${randomUUID()}`,
      media_type: 'image/png',
      size_bytes: '1',
    });
    const fileB = await insert('files', {
      professional_id: professionalB,
      storage_key: `fixture/${randomUUID()}`,
      media_type: 'image/png',
      size_bytes: '1',
    });
    const childA = await insert('children', {
      professional_id: professionalA,
      account_id: childAccountA,
      date_of_birth: '2016-01-01',
      guardian_name: 'Synthetic guardian',
      photo_file_id: fileA,
    });
    const childB = await insert('children', {
      professional_id: professionalB,
      account_id: childAccountB,
      date_of_birth: '2016-01-01',
      guardian_name: 'Synthetic guardian',
      photo_file_id: fileB,
    });
    const activityA = await insert('activities', {
      child_id: childA,
      professional_id: professionalA,
      name: 'Synthetic activity',
      emotion: 'joy',
      image_file_id: fileA,
    });
    const activityB = await insert('activities', {
      child_id: childB,
      professional_id: professionalB,
      name: 'Synthetic activity',
      emotion: 'joy',
      image_file_id: fileB,
    });
    const optionA = await insert('activity_options', {
      activity_id: activityA,
      position: 1,
      label: 'joy',
      is_correct: true,
    });
    const wrongOptionA = await insert('activity_options', {
      activity_id: activityA,
      position: 2,
      label: 'surprise',
      is_correct: false,
    });
    await insert('activity_options', {
      activity_id: activityA,
      position: 3,
      label: 'sadness',
      is_correct: false,
    });
    const optionB = await insert('activity_options', {
      activity_id: activityB,
      position: 1,
      label: 'joy',
      is_correct: true,
    });
    await insert('rewards', {
      activity_id: activityA,
      professional_id: professionalA,
      image_file_id: fileA,
      message: 'Synthetic reward',
    });
    const resultA = await insert('activity_results', {
      activity_id: activityA,
      professional_id: professionalA,
      sequence: 1,
      status: 'in_progress',
      started_at: startedAt,
    });
    const resultB = await insert('activity_results', {
      activity_id: activityB,
      professional_id: professionalB,
      sequence: 1,
      status: 'in_progress',
      started_at: startedAt,
    });
    return {
      admin,
      professionalAccountA,
      professionalAccountB,
      professionalA,
      professionalB,
      childAccountA,
      childAccountB,
      fileA,
      fileB,
      childA,
      childB,
      activityA,
      activityB,
      optionA,
      wrongOptionA,
      optionB,
      resultA,
      resultB,
    };
  }

  async function attempt(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    return insert('activity_attempts', {
      result_id: fixtures.resultA,
      activity_id: fixtures.activityA,
      selected_option_id: fixtures.optionA,
      attempt_number: 1,
      operation_id: randomUUID(),
      started_at: startedAt,
      answered_at: answeredAt,
      duration_seconds: '1',
      timing_source: 'server_elapsed',
      is_correct: true,
      ...overrides,
    });
  }

  async function completeResult(
    outcome: 'correct' | 'attempts_exhausted' = 'correct',
  ): Promise<void> {
    await runner.query(
      "UPDATE activity_results SET status = 'completed', outcome = ?, completed_at = ? WHERE id = ?",
      [outcome, answeredAt, fixtures.resultA],
    );
  }

  async function rejected(
    operation: Promise<unknown>,
    code: string | RegExp,
  ): Promise<void> {
    await expect(operation).rejects.toMatchObject({
      driverError: {
        code: code instanceof RegExp ? expect.stringMatching(code) : code,
      },
    });
  }

  beforeAll(async () => {
    const environment = readDatabaseEnvironment(process.env);
    if (!environment || environment.database !== 'emotions_development') {
      throw new Error(
        'Testes exigem explicitamente emotions_development, provisionado e sem dados de domínio.',
      );
    }
    source = await initializeDataSource(createDatabaseOptions(environment));
    for (const table of domainTables) {
      const rows = await source.query<{ total: string }[]>(
        `SELECT COUNT(*) AS total FROM \`${table}\``,
      );
      if (String(rows[0]?.total) !== '0')
        throw new Error(
          'Testes cancelados: o banco já contém registros de domínio.',
        );
    }
    const settings = await source.query<
      { mode: string; foreign_keys: number; timezone: string }[]
    >(
      'SELECT @@sql_mode AS mode, @@foreign_key_checks AS foreign_keys, @@session.time_zone AS timezone',
    );
    expect(settings[0]?.mode).toMatch(/STRICT_TRANS_TABLES|STRICT_ALL_TABLES/);
    expect(Number(settings[0]?.foreign_keys)).toBe(1);
    expect(settings[0]?.timezone).toBe('+00:00');
    verifiedEmpty = true;
  });

  beforeEach(async () => {
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    fixtures = await createFixtures();
  });

  afterEach(async () => {
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    if (runner && !runner.isReleased) await runner.release();
  });

  afterAll(async () => {
    try {
      if (verifiedEmpty) {
        for (const table of domainTables) {
          const rows = await source.query<{ total: string }[]>(
            `SELECT COUNT(*) AS total FROM \`${table}\``,
          );
          expect(String(rows[0]?.total)).toBe('0');
        }
      }
    } finally {
      if (source?.isInitialized) await source.destroy();
    }
  });

  it('requires a professional for every child', async () => {
    await rejected(
      runner.query('UPDATE children SET professional_id = NULL WHERE id = ?', [
        fixtures.childA,
      ]),
      'ER_BAD_NULL_ERROR',
    );
  });

  it('rejects a nonexistent professional', async () => {
    await rejected(
      insert('children', {
        professional_id: randomUUID(),
        account_id: await account('child'),
        date_of_birth: '2016-01-01',
        guardian_name: 'Synthetic guardian',
      }),
      /^ER_NO_REFERENCED_ROW(?:_2)?$/,
    );
  });

  it('requires an administrator as the creator of a professional', async () => {
    await rejected(
      runner.query(
        'UPDATE professionals SET created_by_account_id = ? WHERE id = ?',
        [fixtures.professionalAccountB, fixtures.professionalA],
      ),
      /^ER_NO_REFERENCED_ROW(?:_2)?$/,
    );
  });

  it('does not attach a professional account to a child profile', async () => {
    await rejected(
      runner.query('UPDATE children SET account_id = ? WHERE id = ?', [
        fixtures.professionalAccountA,
        fixtures.childA,
      ]),
      /^ER_NO_REFERENCED_ROW(?:_2)?$/,
    );
  });

  it('rejects a photo belonging to another professional', async () => {
    await rejected(
      runner.query('UPDATE children SET photo_file_id = ? WHERE id = ?', [
        fixtures.fileB,
        fixtures.childA,
      ]),
      /^ER_NO_REFERENCED_ROW(?:_2)?$/,
    );
  });

  it('rejects an activity bound to another professionals child', async () => {
    await rejected(
      runner.query('UPDATE activities SET child_id = ? WHERE id = ?', [
        fixtures.childB,
        fixtures.activityA,
      ]),
      /^ER_NO_REFERENCED_ROW(?:_2)?$/,
    );
  });

  it('rejects another professionals image in a reward', async () => {
    await rejected(
      runner.query(
        'UPDATE rewards SET image_file_id = ? WHERE activity_id = ?',
        [fixtures.fileB, fixtures.activityA],
      ),
      /^ER_NO_REFERENCED_ROW(?:_2)?$/,
    );
  });

  it('allows at most one reward per activity', async () => {
    await rejected(
      insert('rewards', {
        activity_id: fixtures.activityA,
        professional_id: fixtures.professionalA,
        image_file_id: fixtures.fileA,
        message: 'Duplicate',
      }),
      'ER_DUP_ENTRY',
    );
  });

  it('rejects duplicate option positions', async () => {
    await rejected(
      insert('activity_options', {
        activity_id: fixtures.activityA,
        position: 2,
        label: 'Duplicate',
      }),
      'ER_DUP_ENTRY',
    );
  });

  it('rejects a fourth option position', async () => {
    await rejected(
      insert('activity_options', {
        activity_id: fixtures.activityA,
        position: 4,
        label: 'Fourth',
      }),
      'ER_CHECK_CONSTRAINT_VIOLATED',
    );
  });

  it('allows at most one correct option', async () => {
    await rejected(
      runner.query('UPDATE activity_options SET is_correct = 1 WHERE id = ?', [
        fixtures.wrongOptionA,
      ]),
      'ER_DUP_ENTRY',
    );
  });

  it('rejects two open results for the same activity', async () => {
    await rejected(
      insert('activity_results', {
        activity_id: fixtures.activityA,
        professional_id: fixtures.professionalA,
        sequence: 2,
        repeat_of_result_id: fixtures.resultA,
        reset_operation_id: randomUUID(),
      }),
      'ER_DUP_ENTRY',
    );
  });

  it('preserves the previous result and attempts when a repeat is released', async () => {
    await attempt();
    await completeResult();
    const repeat = await insert('activity_results', {
      activity_id: fixtures.activityA,
      professional_id: fixtures.professionalA,
      sequence: 2,
      repeat_of_result_id: fixtures.resultA,
      reset_operation_id: randomUUID(),
    });
    expect(repeat).not.toBe(fixtures.resultA);
    expect(
      await runner.query(
        'SELECT id FROM activity_attempts WHERE result_id = ?',
        [fixtures.resultA],
      ),
    ).toHaveLength(1);
    const previous: { status: string; outcome: string }[] = await runner.query(
      'SELECT status, outcome FROM activity_results WHERE id = ?',
      [fixtures.resultA],
    );
    expect(previous[0]).toMatchObject({
      status: 'completed',
      outcome: 'correct',
    });
    const next: { status: string; outcome: string | null }[] =
      await runner.query(
        'SELECT status, outcome FROM activity_results WHERE id = ?',
        [repeat],
      );
    expect(next[0]).toMatchObject({ status: 'ready', outcome: null });
  });

  it('rejects a fourth attempt number', async () => {
    await rejected(
      attempt({ attempt_number: 4 }),
      'ER_CHECK_CONSTRAINT_VIOLATED',
    );
  });

  it('rejects duplicate attempt numbers', async () => {
    await attempt();
    await rejected(attempt(), 'ER_DUP_ENTRY');
  });

  it('deduplicates repeated attempt operations', async () => {
    const operation = randomUUID();
    await attempt({ operation_id: operation });
    await rejected(
      attempt({ attempt_number: 2, operation_id: operation }),
      'ER_DUP_ENTRY',
    );
  });

  it('rejects a selected option from another activity', async () => {
    await rejected(
      attempt({ selected_option_id: fixtures.optionB }),
      /^ER_NO_REFERENCED_ROW(?:_2)?$/,
    );
  });

  it('rejects an result belonging to another activity', async () => {
    await rejected(
      attempt({ result_id: fixtures.resultB }),
      /^ER_NO_REFERENCED_ROW(?:_2)?$/,
    );
  });

  it('does not allow an outcome while the result is still open', async () => {
    await rejected(
      runner.query(
        "UPDATE activity_results SET outcome = 'correct' WHERE id = ?",
        [fixtures.resultA],
      ),
      'ER_CHECK_CONSTRAINT_VIOLATED',
    );
  });

  it('requires an outcome to finalize a result', async () => {
    await rejected(
      runner.query(
        "UPDATE activity_results SET status = 'completed', completed_at = ? WHERE id = ?",
        [answeredAt, fixtures.resultA],
      ),
      'ER_CHECK_CONSTRAINT_VIOLATED',
    );
  });

  it('derives attempt count and total time from each result without duplicated totals', async () => {
    await attempt({
      selected_option_id: fixtures.wrongOptionA,
      is_correct: false,
      duration_seconds: '2',
    });
    await attempt({ attempt_number: 2, duration_seconds: '3' });
    await completeResult();
    const totals: { attempts: string; duration: string }[] = await runner.query(
      'SELECT COUNT(*) AS attempts, SUM(duration_seconds) AS duration FROM activity_attempts WHERE result_id = ?',
      [fixtures.resultA],
    );
    expect(String(totals[0]?.attempts)).toBe('2');
    expect(String(totals[0]?.duration)).toBe('5');
  });

  it('stores durations beyond JavaScript safe integer precision without rounding', async () => {
    const id = await attempt({
      duration_seconds: '9007199254740993',
      timing_source: 'client_active',
    });
    const rows: { duration_seconds: string }[] = await runner.query(
      'SELECT duration_seconds FROM activity_attempts WHERE id = ?',
      [id],
    );
    expect(rows[0]?.duration_seconds).toBe('9007199254740993');
  });

  it('rejects negative duration', async () => {
    await rejected(
      attempt({ duration_seconds: '-1' }),
      'ER_WARN_DATA_OUT_OF_RANGE',
    );
  });

  it('requires start time for an in-progress result', async () => {
    await rejected(
      runner.query(
        'UPDATE activity_results SET started_at = NULL WHERE id = ?',
        [fixtures.resultA],
      ),
      'ER_CHECK_CONSTRAINT_VIOLATED',
    );
  });

  it('blocks deletion of a referenced professional instead of cascading', async () => {
    await rejected(
      runner.query('DELETE FROM professionals WHERE id = ?', [
        fixtures.professionalA,
      ]),
      /^ER_ROW_IS_REFERENCED(?:_2)?$/,
    );
  });

  it('excludes credential hashes and storage keys from default ORM selects', async () => {
    const account = await runner.manager
      .getRepository(AccountEntity)
      .findOneByOrFail({ id: fixtures.admin });
    const file = await runner.manager
      .getRepository(StoredFileEntity)
      .findOneByOrFail({ id: fixtures.fileA });
    expect(account).not.toHaveProperty('passwordHash');
    expect(file).not.toHaveProperty('storageKey');
  });

  it('keeps birth dates as civil strings', async () => {
    const rows: { date_of_birth: string }[] = await runner.query(
      'SELECT date_of_birth FROM children WHERE id = ?',
      [fixtures.childA],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.date_of_birth).toBe('2016-01-01');
    const child = await runner.manager
      .getRepository(ChildEntity)
      .findOneByOrFail({ id: fixtures.childA });
    expect(child.dateOfBirth).toBe('2016-01-01');
  });

  it('enforces username normalization in the database', async () => {
    await rejected(
      insert('accounts', {
        name: 'Synthetic account',
        username: `Upper_${randomUUID()}`,
        password_hash: 'fixture-only-not-a-login-credential',
        role: 'child',
      }),
      'ER_CHECK_CONSTRAINT_VIOLATED',
    );
  });

  it('prevents simultaneous migration runners on different connections', async () => {
    const other = source.createQueryRunner();
    await other.connect();
    let acquired = false;
    try {
      await acquireMigrationLock(runner);
      acquired = true;
      await expect(acquireMigrationLock(other)).rejects.toThrow('bloqueio');
    } finally {
      if (acquired)
        await runner.query('SELECT RELEASE_LOCK(?)', [migrationLockName]);
      await other.release();
    }
  });
});
