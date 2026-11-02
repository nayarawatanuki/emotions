import type { QueryRunner } from 'typeorm';

export const migrationLockName = 'emotions_development:schema_migrations';

export async function acquireMigrationLock(
  queryRunner: Pick<QueryRunner, 'query'>,
): Promise<void> {
  const result: unknown = await queryRunner.query(
    'SELECT GET_LOCK(?, 0) AS acquired',
    [migrationLockName],
  );
  const lock: unknown = Array.isArray(result) ? result[0] : undefined;
  if (
    !lock ||
    typeof lock !== 'object' ||
    !('acquired' in lock) ||
    (lock.acquired !== 1 && lock.acquired !== '1')
  ) {
    throw new Error('Não foi possível obter o bloqueio de migrations.');
  }
}
