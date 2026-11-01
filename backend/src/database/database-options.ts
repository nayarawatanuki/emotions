import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DatabaseEnvironment } from '../config/database-environment.js';

export function createDatabaseOptions(
  environment: DatabaseEnvironment,
): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: environment.host,
    port: environment.port,
    username: environment.username,
    password: environment.password,
    database: environment.database,
    ssl: environment.tls ? { rejectUnauthorized: true } : false,
    charset: 'utf8mb4',
    timezone: 'Z',
    poolSize: 5,
    connectTimeout: 5000,
    multipleStatements: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    entities: [],
    migrations: [],
    logging: false,
    retryAttempts: 1,
    verboseRetryLog: false,
  };
}
