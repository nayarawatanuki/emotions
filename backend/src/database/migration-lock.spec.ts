import type { QueryRunner } from 'typeorm';
import { acquireMigrationLock } from './migration-lock.js';

describe('migration lock', () => {
  it.each([1, '1'])(
    'accepts the MySQL success representation %j',
    async (acquired) => {
      const query = vi
        .fn<QueryRunner['query']>()
        .mockResolvedValue([{ acquired }]);
      await expect(acquireMigrationLock({ query })).resolves.toBeUndefined();
    },
  );

  it.each([0, '0', null, undefined, true, '01'])(
    'rejects a lock that was not acquired: %j',
    async (acquired) => {
      const query = vi
        .fn<QueryRunner['query']>()
        .mockResolvedValue([{ acquired }]);
      await expect(acquireMigrationLock({ query })).rejects.toThrow('bloqueio');
    },
  );

  it.each([[], {}, null])(
    'rejects malformed driver responses',
    async (response) => {
      const query = vi.fn<QueryRunner['query']>().mockResolvedValue(response);
      await expect(acquireMigrationLock({ query })).rejects.toThrow('bloqueio');
    },
  );
});
