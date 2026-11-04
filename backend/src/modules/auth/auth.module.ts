import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AUTH_ENVIRONMENT } from '../../config/auth-environment.js';
import type { AuthEnvironment } from '../../config/auth-environment.js';
import { AuthController } from './controllers/auth.controller.js';
import { AuthAccessGuard } from './guards/auth-access.guard.js';
import { PasswordService } from './services/password.service.js';
import { PasswordVerificationService } from './services/password-verification.service.js';
import { AuthLoginService } from './services/auth-login.service.js';
import { AuthSessionService } from './services/auth-session.service.js';
import { AuthRateLimitService } from './services/auth-rate-limit.service.js';

@Module({})
export class AuthModule {
  static register(environment: AuthEnvironment): DynamicModule {
    return {
      module: AuthModule,
      controllers: [AuthController],
      providers: [
        { provide: AUTH_ENVIRONMENT, useValue: environment },
        PasswordService,
        PasswordVerificationService,
        AuthLoginService,
        AuthSessionService,
        AuthRateLimitService,
        { provide: APP_GUARD, useClass: AuthAccessGuard },
      ],
    };
  }
}
