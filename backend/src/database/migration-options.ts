import type { DataSourceOptions } from 'typeorm';
import { readDatabaseEnvironment } from '../config/database-environment.js';
import { createDatabaseOptions } from './database-options.js';
import { InitialDomainSchema1793520000000 } from './migrations/1793520000000-initial-domain-schema.js';
import { UnifyActivityResults1793520001000 } from './migrations/1793520001000-unify-activity-results.js';

export const databaseMigrations = [
  InitialDomainSchema1793520000000,
  UnifyActivityResults1793520001000,
];
export const migrationsTableName = 'schema_migrations';

export function createMigrationOptions(
  source: NodeJS.ProcessEnv,
): DataSourceOptions {
  const environment = readDatabaseEnvironment({
    ...source,
    DB_USER: source.MIGRATION_DB_USER,
    DB_PASSWORD: source.MIGRATION_DB_PASSWORD,
  });
  if (!environment) {
    throw new Error('Habilite a conexão antes de executar migrations.');
  }
  if (environment.username === source.DB_USER) {
    throw new Error(
      'Migrations exigem um usuário diferente do usuário da API.',
    );
  }
  if (environment.database !== 'emotions_development') {
    throw new Error(
      'Esta ferramenta está limitada ao banco emotions_development.',
    );
  }
  return {
    ...createDatabaseOptions(environment),
    poolSize: 1,
    migrations: databaseMigrations,
    migrationsTableName,
    // MySQL DDL commits implicitly; a transaction cannot undo these table changes.
    migrationsTransactionMode: 'none',
  };
}
