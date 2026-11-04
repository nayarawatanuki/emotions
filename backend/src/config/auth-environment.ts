import { readEnvironment } from './environment.js';

export const AUTH_ENVIRONMENT = Symbol('AUTH_ENVIRONMENT');
export interface AuthEnvironment {
  readonly origin: string;
  readonly secret: string;
  readonly secureCookie: boolean;
  readonly cookieName: string;
}

export function readAuthEnvironment(
  source: NodeJS.ProcessEnv,
): AuthEnvironment | null {
  const enabled = source.AUTH_ENABLED ?? 'false';
  if (!['true', 'false'].includes(enabled))
    throw new Error('AUTH_ENABLED deve ser true ou false.');
  if (enabled === 'false') return null;
  if (source.DB_ENABLED !== 'true')
    throw new Error('Autenticação exige DB_ENABLED=true.');
  const { nodeEnv, host } = readEnvironment(source);
  let url: URL;
  try {
    url = new URL(source.AUTH_ORIGIN ?? '');
  } catch {
    throw new Error(
      'AUTH_ORIGIN deve informar uma origem HTTP local ou HTTPS.',
    );
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.origin !== source.AUTH_ORIGIN ||
    url.username ||
    url.password ||
    !['http:', 'https:'].includes(url.protocol) ||
    (url.protocol !== 'https:' &&
      (!local ||
        nodeEnv === 'production' ||
        !['localhost', '127.0.0.1', '::1'].includes(host)))
  ) {
    throw new Error(
      'AUTH_ORIGIN exige origem exata, sem caminho, credenciais ou HTTP inseguro.',
    );
  }
  const secret = source.AUTH_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret))
    throw new Error(
      'AUTH_SECRET deve conter 32 bytes aleatórios em 64 caracteres hexadecimais minúsculos.',
    );
  const secureCookie = url.protocol === 'https:';
  return Object.freeze({
    origin: url.origin,
    secret,
    secureCookie,
    cookieName: secureCookie
      ? '__Host-emotions_session'
      : 'emotions_session_local',
  });
}
