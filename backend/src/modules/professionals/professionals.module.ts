import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ProfessionalsController } from './controllers/professionals.controller.js';
import { ProfessionalOnboardingService } from './services/professional-onboarding.service.js';

@Module({})
export class ProfessionalsModule {
  static register(authentication: DynamicModule): DynamicModule {
    return {
      module: ProfessionalsModule,
      imports: [authentication],
      controllers: [ProfessionalsController],
      providers: [ProfessionalOnboardingService],
    };
  }
}
