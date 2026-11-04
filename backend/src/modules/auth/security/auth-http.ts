import {
  ForbiddenException,
  UnsupportedMediaTypeException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthEnvironment } from '../../../config/auth-environment.js';
import { isSessionToken } from './session-tokens.js';
import { sessionAbsoluteMilliseconds } from '../auth.types.js';

export function assertAuthOrigin(
  request: Request,
  environment: AuthEnvironment,
  writing: boolean,
): void {
  const origin = request.headers.origin;
  const site = request.headers['sec-fetch-site'];
  if (
    (environment.secureCookie && !request.secure) ||
    (origin !== undefined && origin !== environment.origin) ||
    (site !== undefined && site !== 'same-origin' && site !== 'none')
  )
    throw new ForbiddenException();
  if (writing) {
    if (
      origin !== environment.origin ||
      request.headers['x-emotions-request'] !== '1'
    )
      throw new ForbiddenException();
    if (!request.is('application/json'))
      throw new UnsupportedMediaTypeException();
  }
}

// Accept only our canonical opaque token; this is not a general cookie parser.
export function readSessionCookie(
  request: Request,
  name: string,
): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  if (header.length > 8192) throw new BadRequestException();
  const matches = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      const separator = part.indexOf('=');
      return separator >= 0 && part.slice(0, separator) === name;
    });
  if (matches.length > 1) throw new BadRequestException();
  const value = matches[0]?.slice(name.length + 1);
  if (value === undefined) return null;
  if (!isSessionToken(value)) throw new UnauthorizedException();
  return value;
}

export function writeSessionCookie(
  response: Response,
  environment: AuthEnvironment,
  token: string,
): void {
  response.cookie(environment.cookieName, token, {
    httpOnly: true,
    secure: environment.secureCookie,
    sameSite: 'lax',
    path: '/',
    maxAge: sessionAbsoluteMilliseconds,
  });
}
export function clearSessionCookie(
  response: Response,
  environment: AuthEnvironment,
): void {
  response.clearCookie(environment.cookieName, {
    httpOnly: true,
    secure: environment.secureCookie,
    sameSite: 'lax',
    path: '/',
  });
}
