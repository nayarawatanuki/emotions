import { DataSource } from 'typeorm';
import { readDatabaseEnvironment } from '../config/database-environment.js';
import { createDatabaseOptions } from './database-options.js';
import {
  databaseMigrations,
  migrationsTableName,
} from './migration-options.js';

let dataSource: DataSource | undefined;
try {
  const environment = readDatabaseEnvironment(process.env);
  if (!environment) throw new Error();
  dataSource = new DataSource(createDatabaseOptions(environment));
  await dataSource.initialize();
  const tables = await dataSource.query<{ total: string }[]>(
    'SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [migrationsTableName],
  );
  const executed =
    tables[0]?.total === '1'
      ? await dataSource.query<{ name: string }[]>(
          'SELECT name FROM schema_migrations ORDER BY timestamp, id',
        )
      : [];
  const names = new Set(executed.map((migration) => migration.name));
  for (const Migration of databaseMigrations) {
    const name = new Migration().name;
    console.info(`${names.has(name) ? 'Aplicada' : 'Pendente'}: ${name}`);
  }
} catch {
  console.error('Não foi possível consultar o status das migrations.');
  process.exitCode = 1;
} finally {
  try {
    if (dataSource?.isInitialized) await dataSource.destroy();
  } catch {
    console.error('Não foi possível encerrar a conexão de consulta.');
    process.exitCode = 1;
  }
}
