import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import type { DatabaseEnvironment } from '../config/database-environment.js';
import { createDatabaseOptions } from './database-options.js';

@Module({})
export class DatabaseModule {
  static register(environment: DatabaseEnvironment): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            ...createDatabaseOptions(environment),
            retryAttempts: 1,
            verboseRetryLog: false,
          }),
          dataSourceFactory: initializeDataSource,
        }),
      ],
    };
  }
}

export async function initializeDataSource(
  options?: DataSourceOptions,
): Promise<DataSource> {
  try {
    if (!options) throw new Error();
    return await new DataSource(options).initialize();
  } catch {
    // Driver errors can contain usernames, hostnames and SQL.
    throw new Error('Não foi possível conectar ao banco de dados.');
  }
}
