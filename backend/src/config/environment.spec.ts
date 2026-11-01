import { readEnvironment } from './environment.js';

describe('readEnvironment', () => {
  it('uses loopback and port 3000 by default', () => {
    expect(readEnvironment({})).toStrictEqual({
      nodeEnv: 'development',
      host: '127.0.0.1',
      port: 3000,
    });
  });

  it('accepts explicit production configuration', () => {
    expect(
      readEnvironment({
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: '8080',
      }),
    ).toStrictEqual({ nodeEnv: 'production', host: '0.0.0.0', port: 8080 });
  });

  it.each(['1', '65535'])('accepts the valid port boundary %s', (port) => {
    expect(readEnvironment({ PORT: port }).port).toBe(Number(port));
  });

  it.each(['localhost', '::1'])('accepts the local host %s', (host) => {
    expect(readEnvironment({ HOST: host }).host).toBe(host);
  });

  it.each(['', '0', '-1', '65536', '3000x', '3.5', '3e3', ' 3000', '3000 '])(
    'rejects invalid port %j without disclosing its value',
    (port) => {
      expect(() => readEnvironment({ PORT: port })).toThrow(
        'PORT deve ser um número inteiro entre 1 e 65535.',
      );
    },
  );

  it.each(['', 'https://example.com', '127.0.0.999'])(
    'rejects invalid host %j',
    (host) => {
      expect(() => readEnvironment({ HOST: host })).toThrow(
        'HOST deve ser localhost ou um endereço IP válido.',
      );
    },
  );

  it('rejects an invalid environment', () => {
    expect(() => readEnvironment({ NODE_ENV: 'unexpected' })).toThrow(
      'NODE_ENV deve ser development, test ou production.',
    );
  });
});
