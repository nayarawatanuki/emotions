import { Module } from '@nestjs/common';
import { ChildrenController } from './controllers/children.controller.js';
import { ChildrenService } from './services/children.service.js';
@Module({ controllers: [ChildrenController], providers: [ChildrenService] })
export class ChildrenModule {}
