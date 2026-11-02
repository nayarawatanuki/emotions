import type { QueryRunner } from 'typeorm';
import { AddAuthenticationPersistence1793520002000 } from './1793520002000-add-authentication-persistence.js';

describe('authentication persistence migration preflight', () => {
  const migration = new AddAuthenticationPersistence1793520002000();
  function runner() {
    return {
      query: vi.fn<QueryRunner['query']>().mockResolvedValue([{ total: '0' }]),
    };
  }

  it.each([1, '1', null, undefined, 'unexpected'])(
    'refuses incompatible accounts before any DDL: %j',
    async (total) => {
      const r = runner();
      r.query.mockResolvedValueOnce([{ total }]);
      await expect(migration.up(r)).rejects.toThrow('nenhum DDL');
      expect(r.query).toHaveBeenCalledTimes(1);
      expect(r.query.mock.calls[0]?.[0]).toContain('password_hash');
    },
  );

  it('refuses a table collision before altering accounts', async () => {
    const r = runner();
    r.query
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([{ total: '1' }]);
    await expect(migration.up(r)).rejects.toThrow('nenhum DDL');
    expect(r.query).toHaveBeenCalledTimes(2);
    expect(
      r.query.mock.calls.every(([sql]) => sql.startsWith('SELECT COUNT(*)')),
    ).toBe(true);
  });

  it('preflights accounts and table names before changing structure', async () => {
    const r = runner();
    await migration.up(r);
    expect(r.query.mock.calls[1]?.[1]).toEqual([
      'auth_sessions',
      'account_tokens',
      'auth_rate_limits',
    ]);
    expect(r.query.mock.calls[2]?.[0]).toContain('ck_accounts_password_state');
    const ddl = r.query.mock.calls.slice(2).map(([sql]) => sql);
    expect(ddl).toHaveLength(4);
    expect(ddl.filter((sql) => sql.startsWith('CREATE TABLE'))).toHaveLength(3);
    expect(ddl.every((sql) => !sql.includes('IF NOT EXISTS'))).toBe(true);
    expect(
      ddl.some((sql) => /INSERT|UPDATE accounts|DELETE FROM/.test(sql)),
    ).toBe(false);
    expect(migration.transaction).toBe(false);
  });

  it.each([0, 1, 2, 3])(
    'refuses rollback before DDL when guard %i finds records or null passwords',
    async (guard) => {
      const r = runner();
      for (let index = 0; index < guard; index++)
        r.query.mockResolvedValueOnce([{ total: '0' }]);
      r.query.mockResolvedValueOnce([{ total: '1' }]);
      await expect(migration.down(r)).rejects.toThrow('nenhum DDL');
      expect(r.query).toHaveBeenCalledTimes(guard + 1);
      expect(
        r.query.mock.calls.every(([sql]) => sql.startsWith('SELECT COUNT(*)')),
      ).toBe(true);
    },
  );

  it('restores password NOT NULL only after every rollback guard passed', async () => {
    const r = runner();
    await migration.down(r);
    expect(
      r.query.mock.calls
        .slice(0, 4)
        .every(([sql]) => sql.startsWith('SELECT COUNT(*)')),
    ).toBe(true);
    expect(r.query.mock.calls[3]?.[0]).toBe(
      'SELECT COUNT(*) AS total FROM accounts WHERE password_hash IS NULL',
    );
    expect(r.query.mock.calls.slice(4, 7).map(([sql]) => sql)).toEqual([
      'DROP TABLE `auth_rate_limits`',
      'DROP TABLE `account_tokens`',
      'DROP TABLE `auth_sessions`',
    ]);
    expect(r.query.mock.calls[7]?.[0]).toContain('varchar(255) NOT NULL');
  });
});
