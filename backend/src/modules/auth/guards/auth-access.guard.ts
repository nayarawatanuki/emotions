import {
  Inject,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { AUTH_ENVIRONMENT } from '../../../config/auth-environment.js';
import type { AuthEnvironment } from '../../../config/auth-environment.js';
import type { AdultRole, AuthenticatedRequest } from '../auth.types.js';
import { PUBLIC_ROUTE, ALLOWED_ROLES } from '../decorators/access.decorator.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import {
  assertAuthOrigin,
  readSessionCookie,
  clearSessionCookie,
} from '../security/auth-http.js';
import { verifyCsrf } from '../security/session-tokens.js';

@Injectable()
export class AuthAccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets))
      return true;
    const roles = this.reflector.getAllAndOverride<AdultRole[]>(
      ALLOWED_ROLES,
      targets,
    );
    if (!roles?.length) throw new ForbiddenException();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const writing = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    assertAuthOrigin(request, this.environment, writing);
    try {
      const token = readSessionCookie(request, this.environment.cookieName);
      if (!token) throw new UnauthorizedException();
      if (
        writing &&
        !verifyCsrf(
          this.environment.secret,
          token,
          request.headers['x-csrf-token'],
        )
      )
        throw new ForbiddenException();
      const session = await this.sessions.authenticate(token);
      if (!roles.includes(session.user.role)) throw new ForbiddenException();
      request.auth = session;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException)
        clearSessionCookie(response, this.environment);
      throw error;
    }
  }
}
