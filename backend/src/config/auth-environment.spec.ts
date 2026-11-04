import { readAuthEnvironment } from './auth-environment.js';
const valid = {
  AUTH_ENABLED: 'true',
  DB_ENABLED: 'true',
  AUTH_ORIGIN: 'http://127.0.0.1:3000',
  AUTH_SECRET: '0123456789abcdef'.repeat(4),
};
describe('authentication configuration', () => {
  it('is disabled by default', () =>
    expect(readAuthEnvironment({})).toBeNull());
  it('uses a local cookie only on local development HTTP', () =>
    expect(readAuthEnvironment(valid)).toMatchObject({
      secureCookie: false,
      cookieName: 'emotions_session_local',
    }));
  it('requires a secure host cookie in production', () =>
    expect(
      readAuthEnvironment({
        ...valid,
        NODE_ENV: 'production',
        AUTH_ORIGIN: 'https://emotions.example',
      }),
    ).toMatchObject({
      secureCookie: true,
      cookieName: '__Host-emotions_session',
    }));
  it.each([
    { AUTH_ENABLED: 'yes' },
    { DB_ENABLED: 'false' },
    { AUTH_SECRET: '' },
    { AUTH_SECRET: 'secret' },
    { AUTH_ORIGIN: 'http://emotions.example' },
    { AUTH_ORIGIN: 'https://emotions.example/' },
    { AUTH_ORIGIN: 'https://user:secret@emotions.example' },
    { AUTH_ORIGIN: 'https://emotions.example/path' },
    { AUTH_ORIGIN: 'https://emotions.example?query=1' },
    { AUTH_ORIGIN: 'null' },
    { NODE_ENV: 'production' },
    { HOST: '0.0.0.0' },
  ])('rejects unsafe or incomplete configuration: %j', (patch) =>
    expect(() => readAuthEnvironment({ ...valid, ...patch })).toThrow(),
  );
});
