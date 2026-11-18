import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { validateImageStorageDirectory } from '../../config/image-storage-environment.js';
import { LocalImageStorageService } from './services/local-image-storage.service.js';

@Module({})
export class FilesModule {
  static registerLocal(directory: string): DynamicModule {
    return {
      module: FilesModule,
      providers: [
        {
          provide: LocalImageStorageService,
          useFactory: async () =>
            new LocalImageStorageService(
              await validateImageStorageDirectory(directory),
            ),
        },
      ],
      exports: [LocalImageStorageService],
    };
  }
}
