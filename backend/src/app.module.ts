import { ChildrenModule } from './modules/children/children.module.js';
import { ProfessionalsModule } from './modules/professionals/professionals.module.js';
import { readAuthEnvironment } from './config/auth-environment.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { readDatabaseEnvironment } from './config/database-environment.js';
import { DatabaseModule } from './database/database.module.js';
import {
  readImageStorageEnvironment,
  readMysqlImageStorageEnabled,
} from './config/image-storage-environment.js';
import { FilesModule } from './modules/files/files.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [HealthModule],
})
export class AppModule {
  static register(source: NodeJS.ProcessEnv): DynamicModule {
    const database = readDatabaseEnvironment(source);
    const imageStorage = readImageStorageEnvironment(source);
    const auth = readAuthEnvironment(source);
    const mysqlImages = readMysqlImageStorageEnabled(source);
    if (mysqlImages && !auth)
      throw new Error('IMAGE_STORAGE_MYSQL exige autenticação habilitada.');
    const authentication = auth ? AuthModule.register(auth) : null;
    const files = imageStorage ? FilesModule.registerLocal(imageStorage) : null;
    return {
      module: AppModule,
      imports: [
        ...(!authentication && files ? [files] : []),
        ...(database ? [DatabaseModule.register(database)] : []),
        ...(authentication
          ? [
              authentication,
              ProfessionalsModule.register(authentication),
              ChildrenModule.register(files, mysqlImages),
            ]
          : []),
      ],
    };
  }
}
