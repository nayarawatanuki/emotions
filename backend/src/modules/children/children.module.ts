import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ChildrenController } from './controllers/children.controller.js';
import { ChildrenService } from './services/children.service.js';
import { ChildPhotoService } from './services/child-photo.service.js';

@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService, ChildPhotoService],
})
export class ChildrenModule {
  static register(files: DynamicModule | null): DynamicModule {
    return { module: ChildrenModule, imports: files ? [files] : [] };
  }
}
