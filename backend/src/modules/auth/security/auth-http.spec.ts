import type { Request, Response } from 'express';
import type { AuthEnvironment } from '../../../config/auth-environment.js';
import {
  assertAuthOrigin,
  readSessionCookie,
  writeSessionCookie,
  clearSessionCookie,
} from './auth-http.js';
import { createSessionToken } from './session-tokens.js';
const env: AuthEnvironment = {
  origin: 'http://127.0.0.1:3000',
  secret: '0123456789abcdef'.repeat(4),
  secureCookie: false,
  cookieName: 'emotions_session_local',
};
function request(headers: Request['headers']): Request {
  return {
    headers,
    secure: false,
    is: (type: string) => type === 'application/json',
  } as unknown as Request;
}
describe('authentication HTTP boundary', () => {
  it('accepts canonical credentials among unrelated cookies without decoding', () => {
    const token = createSessionToken();
    expect(
      readSessionCookie(
        request({
          cookie: `other=value; ${env.cookieName}=${token}; unrelated=1`,
        }),
        env.cookieName,
      ),
    ).toBe(token);
    expect(
      readSessionCookie(request({ cookie: 'unrelated=1' }), env.cookieName),
    ).toBeNull();
    expect(
      readSessionCookie(
        request({ cookie: `${env.cookieName}X` }),
        env.cookieName,
      ),
    ).toBeNull();
  });
  it.each([
    `${env.cookieName}=bad`,
    `${env.cookieName}=`,
    `${env.cookieName}=${'A'.repeat(43)}; ${env.cookieName}=${'A'.repeat(43)}`,
    'x'.repeat(8193),
  ])('refuses malformed or ambiguous session cookies', (cookie) =>
    expect(() =>
      readSessionCookie(request({ cookie }), env.cookieName),
    ).toThrow(),
  );
  it('requires exact origin and the custom header for writes', () => {
    expect(() =>
      assertAuthOrigin(
        request({ origin: env.origin, 'x-emotions-request': '1' }),
        env,
        true,
      ),
    ).not.toThrow();
    for (const headers of [
      {},
      { origin: 'https://evil.example', 'x-emotions-request': '1' },
      { origin: env.origin },
      {
        origin: env.origin,
        'x-emotions-request': '1',
        'sec-fetch-site': 'cross-site',
      },
    ])
      expect(() => assertAuthOrigin(request(headers), env, true)).toThrow();
  });
  it('rejects cleartext requests when secure cookies are configured', () =>
    expect(() =>
      assertAuthOrigin(request({}), { ...env, secureCookie: true }, false),
    ).toThrow());
  it('uses matching safe cookie options when setting and clearing', () => {
    const cookie = vi.fn();
    const clearCookie = vi.fn();
    const response = { cookie, clearCookie } as unknown as Response;
    const config = {
      ...env,
      secureCookie: true,
      cookieName: '__Host-emotions_session',
    };
    writeSessionCookie(response, config, createSessionToken());
    clearSessionCookie(response, config);
    expect(cookie.mock.calls[0]?.[2]).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 28_800_000,
    });
    expect(clearCookie).toHaveBeenCalledWith(config.cookieName, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });
});
