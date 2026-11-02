import { createMigrationOptions } from './migration-options.js';

const environment = {
  DB_ENABLED: 'true',
  DB_HOST: '127.0.0.1',
  DB_NAME: 'emotions_development',
  DB_USER: 'emotions_app',
  DB_PASSWORD: 'api-test-secret',
  MIGRATION_DB_USER: 'emotions_migrator',
  MIGRATION_DB_PASSWORD: 'migration-test-secret',
};

describe('migration configuration', () => {
  it('uses separate credentials and disables automatic or transactional DDL', () => {
    expect(createMigrationOptions(environment)).toMatchObject({
      username: 'emotions_migrator',
      password: 'migration-test-secret',
      synchronize: false,
      dropSchema: false,
      migrationsRun: false,
      migrationsTableName: 'schema_migrations',
      migrationsTransactionMode: 'none',
      logging: false,
      poolSize: 1,
    });
  });

  it.each(['MIGRATION_DB_USER', 'MIGRATION_DB_PASSWORD'])(
    'does not fall back to API credentials without %s',
    (key) => {
      expect(() =>
        createMigrationOptions({ ...environment, [key]: '' }),
      ).toThrow();
    },
  );

  it('rejects reuse of the API account', () => {
    expect(() =>
      createMigrationOptions({
        ...environment,
        MIGRATION_DB_USER: 'emotions_app',
      }),
    ).toThrow('usuário diferente');
  });

  it('refuses the legacy database', () => {
    expect(() =>
      createMigrationOptions({ ...environment, DB_NAME: 'emotions' }),
    ).toThrow('limitada ao banco emotions_development');
  });

  it('requires an explicitly enabled database', () => {
    expect(() =>
      createMigrationOptions({ ...environment, DB_ENABLED: 'false' }),
    ).toThrow('Habilite');
  });
});
