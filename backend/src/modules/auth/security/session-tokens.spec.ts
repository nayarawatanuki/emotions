import {
  createSessionToken,
  isSessionToken,
  sessionDigest,
  csrfToken,
  verifyCsrf,
  keyedDigest,
} from './session-tokens.js';
const secret = '0123456789abcdef'.repeat(4);
describe('opaque sessions and bound CSRF tokens', () => {
  it('creates independent canonical 32-byte random tokens', () => {
    const first = createSessionToken();
    const second = createSessionToken();
    expect(isSessionToken(first)).toBe(true);
    expect(first).not.toBe(second);
    expect(sessionDigest(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionDigest(first)).not.toBe(first);
  });
  it('binds CSRF to both the session and server secret', () => {
    const token = createSessionToken();
    const csrf = csrfToken(secret, token);
    expect(verifyCsrf(secret, token, csrf)).toBe(true);
    expect(verifyCsrf(secret, createSessionToken(), csrf)).toBe(false);
    expect(verifyCsrf('f'.repeat(64), token, csrf)).toBe(false);
    expect(verifyCsrf(secret, token, token)).toBe(false);
  });
  it.each([
    '',
    'A'.repeat(42),
    'A'.repeat(44),
    '%'.repeat(43),
    'A'.repeat(42) + 'B',
    ['A'.repeat(43)],
    null,
  ])('rejects malformed and noncanonical values: %j', (value) => {
    expect(isSessionToken(value)).toBe(false);
    expect(verifyCsrf(secret, createSessionToken(), value)).toBe(false);
  });
  it('separates HMAC domains and structured identifiers', () => {
    expect(keyedDigest(secret, 'scope', ['a', 'b'])).not.toBe(
      keyedDigest(secret, 'other', ['a', 'b']),
    );
    expect(keyedDigest(secret, 'scope', ['ab', 'c'])).not.toBe(
      keyedDigest(secret, 'scope', ['a', 'bc']),
    );
  });
});
