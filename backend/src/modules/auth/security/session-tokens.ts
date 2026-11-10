import { createHmac, timingSafeEqual } from 'node:crypto';
import { isOpaqueToken } from './opaque-tokens.js';
export {
  createOpaqueToken as createSessionToken,
  isOpaqueToken as isSessionToken,
  opaqueTokenDigest as sessionDigest,
} from './opaque-tokens.js';

export function keyedDigest(
  secret: string,
  context: string,
  values: readonly string[],
): string {
  return createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(JSON.stringify([context, ...values]))
    .digest('hex');
}
export function csrfToken(secret: string, token: string): string {
  return Buffer.from(
    keyedDigest(secret, 'session-csrf-v1', [token]),
    'hex',
  ).toString('base64url');
}
export function verifyCsrf(
  secret: string,
  token: string,
  candidate: unknown,
): boolean {
  return (
    isOpaqueToken(candidate) &&
    timingSafeEqual(
      Buffer.from(csrfToken(secret, token), 'base64url'),
      Buffer.from(candidate, 'base64url'),
    )
  );
}
