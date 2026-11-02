import type { QueryRunner } from 'typeorm';
import { UnifyActivityResults1793520001000 } from './1793520001000-unify-activity-results.js';

describe('results unification migration', () => {
  it.each([1, '1', undefined])(
    'refuses to alter tables with data or unverifiable state: %j',
    async (total) => {
      const query = vi
        .fn<QueryRunner['query']>()
        .mockResolvedValue([{ total }]);
      await expect(
        new UnifyActivityResults1793520001000().up({ query }),
      ).rejects.toThrow('nenhum DDL');
      expect(
        query.mock.calls.every(([sql]) => sql.startsWith('SELECT COUNT(*)')),
      ).toBe(true);
    },
  );

  it('checks all affected tables before the first DDL', async () => {
    const query = vi
      .fn<QueryRunner['query']>()
      .mockResolvedValue([{ total: '0' }]);
    await new UnifyActivityResults1793520001000().up({ query });
    expect(
      query.mock.calls
        .slice(0, 3)
        .every(([sql]) => sql.startsWith('SELECT COUNT(*)')),
    ).toBe(true);
    expect(query.mock.calls[3]?.[0]).toBe('DROP TABLE `activity_results`');
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes('RENAME TO `activity_results`'),
      ),
    ).toBe(true);
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes('RENAME COLUMN `execution_id` TO `result_id`'),
      ),
    ).toBe(true);
  });

  it('blocks an automatic rollback after new records exist', async () => {
    const query = vi
      .fn<QueryRunner['query']>()
      .mockResolvedValue([{ total: '1' }]);
    await expect(
      new UnifyActivityResults1793520001000().down({ query }),
    ).rejects.toThrow('nenhum DDL');
    expect(query.mock.calls).toHaveLength(1);
  });
});
