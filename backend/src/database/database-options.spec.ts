import { createDatabaseOptions } from './database-options.js';

describe('createDatabaseOptions', () => {
  const environment = {
    host: '127.0.0.1',
    port: 3306,
    username: 'emotions_app',
    password: 'test-only-secret',
    database: 'emotions_test',
    tls: true,
  };

  it('disables schema changes, automatic migrations, SQL logging and multiple statements', () => {
    expect(createDatabaseOptions(environment)).toMatchObject({
      type: 'mysql',
      synchronize: false,
      dropSchema: false,
      migrationsRun: false,
      logging: false,
      multipleStatements: false,
      migrations: [],
      timezone: 'Z',
      dateStrings: ['DATE'],
      charset: 'utf8mb4',
      connectTimeout: 5000,
      poolSize: 5,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
  });

  it('requires certificate validation when TLS is enabled', () => {
    expect(createDatabaseOptions(environment)).toHaveProperty('ssl', {
      rejectUnauthorized: true,
    });
  });

  it('allows TLS to be disabled by an already validated local configuration', () => {
    expect(
      createDatabaseOptions({ ...environment, tls: false }),
    ).toHaveProperty('ssl', false);
  });
});
