import { isIP } from 'node:net';

type NodeEnvironment = 'development' | 'test' | 'production';

export interface Environment {
  readonly nodeEnv: NodeEnvironment;
  readonly host: string;
  readonly port: number;
}

export function readEnvironment(source: NodeJS.ProcessEnv): Environment {
  const nodeEnv = source.NODE_ENV ?? 'development';
  const host = source.HOST ?? '127.0.0.1';
  const port = source.PORT ?? '3000';

  if (
    nodeEnv !== 'development' &&
    nodeEnv !== 'test' &&
    nodeEnv !== 'production'
  ) {
    throw new Error('NODE_ENV deve ser development, test ou production.');
  }

  if (host !== 'localhost' && isIP(host) === 0) {
    throw new Error('HOST deve ser localhost ou um endereço IP válido.');
  }

  if (!/^[1-9]\d{0,4}$/.test(port) || Number(port) > 65535) {
    throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
  }

  return Object.freeze({
    nodeEnv,
    host,
    port: Number(port),
  });
}
