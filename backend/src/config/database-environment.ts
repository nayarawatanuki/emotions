import { isIP } from 'node:net';

export interface DatabaseEnvironment {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly database: string;
  readonly tls: boolean;
}

function required(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (!value?.trim()) {
    throw new Error(`${key} deve ser informado.`);
  }
  return value;
}

export function readDatabaseEnvironment(
  source: NodeJS.ProcessEnv,
): DatabaseEnvironment | null {
  const enabled = source.DB_ENABLED ?? 'false';
  if (enabled !== 'true' && enabled !== 'false') {
    throw new Error('DB_ENABLED deve ser true ou false.');
  }
  if (enabled === 'false') return null;

  const host = required(source, 'DB_HOST');
  if (
    isIP(host) === 0 &&
    !/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
      host,
    )
  ) {
    throw new Error('DB_HOST deve ser um endereço IP ou hostname válido.');
  }
  const port = source.DB_PORT ?? '3306';
  if (!/^[1-9]\d{0,4}$/.test(port) || Number(port) > 65535) {
    throw new Error('DB_PORT deve ser um número inteiro entre 1 e 65535.');
  }
  const database = required(source, 'DB_NAME');
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(database)) {
    throw new Error(
      'DB_NAME deve conter até 64 letras, números ou sublinhados e começar com letra.',
    );
  }
  const username = required(source, 'DB_USER');
  if (username.trim().toLowerCase() === 'root') {
    throw new Error(
      'DB_USER deve ser um usuário próprio da aplicação, sem privilégios administrativos.',
    );
  }
  const password = required(source, 'DB_PASSWORD');
  const tls = source.DB_TLS ?? 'true';
  if (tls !== 'true' && tls !== 'false') {
    throw new Error('DB_TLS deve ser true ou false.');
  }
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (tls === 'false' && (!local || source.NODE_ENV === 'production')) {
    throw new Error(
      'DB_TLS=false é permitido apenas em conexão local fora de produção.',
    );
  }

  return Object.freeze({
    host,
    port: Number(port),
    username,
    password,
    database,
    tls: tls === 'true',
  });
}
