import { AccountActivationService } from '../services/account-activation.service.js';
import { parseActivationInput } from '../dto/activation-input.js';
import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AUTH_ENVIRONMENT } from '../../../config/auth-environment.js';
import type { AuthEnvironment } from '../../../config/auth-environment.js';
import type { AuthenticatedRequest, SessionView } from '../auth.types.js';
import type { ActivationLink } from '../dto/activation-link.js';
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
    @Inject(AccountActivationService)
    private readonly activation: AccountActivationService,
  ) {}

  @PublicRoute()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionView> {
    return this.signIn(body, request, response, 'adult');
  }

  @PublicRoute()
  @Post('child/login')
  @HttpCode(200)
  childLogin(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionView> {
    return this.signIn(body, request, response, 'child');
  }

  private async signIn(
    body: unknown,
    request: Request,
    response: Response,
    audience: 'adult' | 'child',
  ) {
    assertAuthOrigin(request, this.environment, true);
    const input = parseLoginInput(body);
    const previous = readSessionCookie(request, this.environment.cookieName);
    const result = await this.loginService.login(
      input,
      request.socket.remoteAddress,
      previous,
      audience,
    );
    writeSessionCookie(response, this.environment, result.token);
    return result.session;
  }

  @AllowedRoles('professional')
  @Post('children/:id/invitation')
  issueChildInvitation(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ActivationLink> {
    if (!request.auth) throw new UnauthorizedException();
    return this.activation.issueChild(id, request.auth);
  }

  @PublicRoute()
  @Post('activate')
  @HttpCode(204)
  async activate(
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<void> {
    assertAuthOrigin(request, this.environment, true);
    await this.activation.activate(
      parseActivationInput(body),
      request.socket.remoteAddress,
    );
  }

  @AllowedRoles('administrator', 'professional')
  @Get('session')
  session(@Req() request: AuthenticatedRequest): SessionView {
    return this.currentSession(request);
  }

  @AllowedRoles('child')
  @Get('child/session')
  childSession(@Req() request: AuthenticatedRequest): SessionView {
    return this.currentSession(request);
  }

  private currentSession(request: AuthenticatedRequest): SessionView {
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

  @AllowedRoles('administrator', 'professional', 'child')
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
