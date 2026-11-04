import type { Request } from 'express';

export type AdultRole = 'administrator' | 'professional';
export interface AuthUser {
  id: string;
  name: string;
  role: AdultRole;
}
export interface SessionContext {
  id: string;
  user: AuthUser;
  expiresAt: Date;
  idleExpiresAt: Date;
}
export interface AuthenticatedRequest extends Request {
  auth?: SessionContext;
}
export interface SessionView {
  user: AuthUser;
  csrfToken: string;
  expiresAt: string;
  idleExpiresAt: string;
}
export const sessionIdleMilliseconds = 30 * 60_000;
export const sessionAbsoluteMilliseconds = 8 * 60 * 60_000;
