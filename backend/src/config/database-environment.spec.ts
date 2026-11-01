import { readDatabaseEnvironment } from './database-environment.js';

const configured = {
  DB_ENABLED: 'true',
  DB_HOST: '127.0.0.1',
  DB_NAME: 'emotions_test',
  DB_USER: 'emotions_test_app',
  DB_PASSWORD: 'test-only-secret',
};

describe('readDatabaseEnvironment', () => {
  it('does not enable a connection without an explicit opt-in', () => {
    expect(readDatabaseEnvironment({})).toBeNull();
    expect(readDatabaseEnvironment({ DB_ENABLED: 'false' })).toBeNull();
  });

  it('defaults to TLS and port 3306', () => {
    expect(readDatabaseEnvironment(configured)).toStrictEqual({
      host: '127.0.0.1',
      port: 3306,
      database: 'emotions_test',
      username: 'emotions_test_app',
      password: 'test-only-secret',
      tls: true,
    });
  });

  it.each(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'])(
    'requires %s without disclosing credentials',
    (key) => {
      expect(() =>
        readDatabaseEnvironment({ ...configured, [key]: ' ' }),
      ).toThrow(`${key} deve ser informado.`);
    },
  );

  it.each(['0', '65536', '3306x', ' 3306', '3.5'])(
    'rejects invalid port %s',
    (DB_PORT) => {
      expect(() => readDatabaseEnvironment({ ...configured, DB_PORT })).toThrow(
        'DB_PORT',
      );
    },
  );

  it.each(['https://db.example.com', 'db host', '-db.example.com'])(
    'rejects invalid hosts',
    (DB_HOST) => {
      expect(() => readDatabaseEnvironment({ ...configured, DB_HOST })).toThrow(
        'DB_HOST',
      );
    },
  );

  it.each(['db.example.com', '::1', 'localhost'])(
    'accepts host %s with TLS',
    (DB_HOST) => {
      expect(readDatabaseEnvironment({ ...configured, DB_HOST })?.tls).toBe(
        true,
      );
    },
  );

  it.each(['DB_ENABLED', 'DB_TLS'])('rejects ambiguous boolean %s', (key) => {
    expect(() =>
      readDatabaseEnvironment({ ...configured, [key]: 'yes' }),
    ).toThrow(key);
  });

  it.each(['legacy-db', 'db;DROP TABLE child', 'a'.repeat(65)])(
    'rejects unsupported database names',
    (DB_NAME) => {
      expect(() => readDatabaseEnvironment({ ...configured, DB_NAME })).toThrow(
        'DB_NAME',
      );
    },
  );

  it('rejects use of root', () => {
    expect(() =>
      readDatabaseEnvironment({ ...configured, DB_USER: 'root' }),
    ).toThrow('DB_USER');
  });

  it('preserves significant whitespace in passwords', () => {
    expect(
      readDatabaseEnvironment({ ...configured, DB_PASSWORD: ' secret ' })
        ?.password,
    ).toBe(' secret ');
  });

  it.each(['127.0.0.1', 'localhost', '::1'])(
    'allows unencrypted local development at %s',
    (DB_HOST) => {
      expect(
        readDatabaseEnvironment({ ...configured, DB_HOST, DB_TLS: 'false' })
          ?.tls,
      ).toBe(false);
    },
  );

  it('requires TLS for remote connections', () => {
    expect(() =>
      readDatabaseEnvironment({
        ...configured,
        DB_HOST: 'db.example.com',
        DB_TLS: 'false',
      }),
    ).toThrow('DB_TLS');
  });

  it('requires TLS in production even on loopback', () => {
    expect(() =>
      readDatabaseEnvironment({
        ...configured,
        NODE_ENV: 'production',
        DB_TLS: 'false',
      }),
    ).toThrow('DB_TLS');
  });
});
