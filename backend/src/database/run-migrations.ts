import { DataSource, MigrationExecutor } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { createMigrationOptions } from './migration-options.js';
import { acquireMigrationLock, migrationLockName } from './migration-lock.js';

let dataSource: DataSource | undefined;
let queryRunner: QueryRunner | undefined;
let locked = false;
try {
  dataSource = new DataSource(createMigrationOptions(process.env));
  await dataSource.initialize();
  queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await acquireMigrationLock(queryRunner);
  locked = true;
  const executor = new MigrationExecutor(dataSource, queryRunner);
  executor.transaction = 'none';
  const executed = await executor.executePendingMigrations();
  console.info(`Migrations aplicadas: ${executed.length}.`);
} catch {
  console.error(
    'Não foi possível aplicar as migrations. Verifique configuração, permissões e possível execução parcial antes de repetir.',
  );
  process.exitCode = 1;
} finally {
  try {
    try {
      if (locked)
        await queryRunner?.query('SELECT RELEASE_LOCK(?)', [migrationLockName]);
    } finally {
      try {
        await queryRunner?.release();
      } finally {
        if (dataSource?.isInitialized) await dataSource.destroy();
      }
    }
  } catch {
    console.error('Não foi possível encerrar a conexão de migrations.');
    process.exitCode = 1;
  }
}
