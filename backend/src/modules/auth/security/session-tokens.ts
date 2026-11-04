import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}
export function isSessionToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(value) &&
    Buffer.from(value, 'base64url').toString('base64url') === value
  );
}
export function sessionDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
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
    isSessionToken(candidate) &&
    timingSafeEqual(
      Buffer.from(csrfToken(secret, token), 'base64url'),
      Buffer.from(candidate, 'base64url'),
    )
  );
}
