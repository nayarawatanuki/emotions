import type { DataSourceOptions } from 'typeorm';
import type { DatabaseEnvironment } from '../config/database-environment.js';
import { databaseEntities } from './database-entities.js';
import { mysqlDriver } from './mysql-driver.js';

export function createDatabaseOptions(
  environment: DatabaseEnvironment,
): Extract<DataSourceOptions, { type: 'mysql' | 'mariadb' }> {
  return {
    type: 'mysql',
    driver: mysqlDriver,
    host: environment.host,
    port: environment.port,
    username: environment.username,
    password: environment.password,
    database: environment.database,
    ssl: environment.tls ? { rejectUnauthorized: true } : false,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: ['DATE'],
    poolSize: 5,
    connectTimeout: 5000,
    multipleStatements: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    entities: databaseEntities,
    migrations: [],
    logging: false,
  };
}
