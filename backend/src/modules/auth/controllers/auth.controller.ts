import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Inject,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AUTH_ENVIRONMENT } from '../../../config/auth-environment.js';
import type { AuthEnvironment } from '../../../config/auth-environment.js';
import type { AuthenticatedRequest, SessionView } from '../auth.types.js';
import { PublicRoute, AllowedRoles } from '../decorators/access.decorator.js';
import { parseLoginInput } from '../dto/login-input.js';
import { AuthLoginService } from '../services/auth-login.service.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import {
  assertAuthOrigin,
  readSessionCookie,
  writeSessionCookie,
  clearSessionCookie,
} from '../security/auth-http.js';
import { csrfToken } from '../security/session-tokens.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    @Inject(AuthLoginService) private readonly loginService: AuthLoginService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  @PublicRoute()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionView> {
    assertAuthOrigin(request, this.environment, true);
    const input = parseLoginInput(body);
    const previous = readSessionCookie(request, this.environment.cookieName);
    const result = await this.loginService.login(
      input,
      request.socket.remoteAddress,
      previous,
    );
    writeSessionCookie(response, this.environment, result.token);
    return result.session;
  }

  @AllowedRoles('administrator', 'professional')
  @Get('session')
  session(@Req() request: AuthenticatedRequest): SessionView {
    const session = request.auth;
    const token = readSessionCookie(request, this.environment.cookieName);
    if (!session || !token) throw new UnauthorizedException();
    return {
      user: session.user,
      csrfToken: csrfToken(this.environment.secret, token),
      expiresAt: session.expiresAt.toISOString(),
      idleExpiresAt: session.idleExpiresAt.toISOString(),
    };
  }

  @AllowedRoles('administrator', 'professional')
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    if (!request.auth) throw new UnauthorizedException();
    await this.sessions.logout(request.auth.id);
    clearSessionCookie(response, this.environment);
  }
}
