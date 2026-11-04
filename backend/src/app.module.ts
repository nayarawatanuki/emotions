import { readAuthEnvironment } from './config/auth-environment.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { readDatabaseEnvironment } from './config/database-environment.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [HealthModule],
})
export class AppModule {
  static register(source: NodeJS.ProcessEnv): DynamicModule {
    const database = readDatabaseEnvironment(source);
    const auth = readAuthEnvironment(source);
    return {
      module: AppModule,
      imports: [
        ...(database ? [DatabaseModule.register(database)] : []),
        ...(auth ? [AuthModule.register(auth)] : []),
      ],
    };
  }
}
