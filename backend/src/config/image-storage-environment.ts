import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const checkoutPath = fileURLToPath(new URL('../../../', import.meta.url));

function containsPath(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

export const MYSQL_IMAGE_STORAGE = Symbol('MYSQL_IMAGE_STORAGE');

export function readMysqlImageStorageEnabled(
  source: NodeJS.ProcessEnv,
): boolean {
  const enabled = source.IMAGE_STORAGE_MYSQL ?? 'false';
  if (enabled !== 'true' && enabled !== 'false')
    throw new Error('IMAGE_STORAGE_MYSQL deve ser true ou false.');
  return enabled === 'true';
}

export function readImageStorageEnvironment(
  source: NodeJS.ProcessEnv,
): string | null {
  const directory = source.IMAGE_STORAGE_DIRECTORY;
  if (directory === undefined || directory === '') return null;
  if (source.NODE_ENV === 'production' || !isAbsolute(directory)) {
    throw new Error(
      'IMAGE_STORAGE_DIRECTORY exige um caminho absoluto em ambiente local.',
    );
  }
  return resolve(directory);
}

export async function validateImageStorageDirectory(
  directory: string,
): Promise<string> {
  try {
    const [canonical, checkout, status] = await Promise.all([
      realpath(directory),
      realpath(checkoutPath),
      lstat(directory),
    ]);
    if (
      canonical === directory &&
      !containsPath(checkout, canonical) &&
      !containsPath(canonical, checkout) &&
      status.isDirectory() &&
      status.uid === process.getuid?.() &&
      (status.mode & 0o777) === 0o700
    ) {
      return canonical;
    }
  } catch {
    // Configuration errors should not expose the local filesystem path.
  }
  throw new Error(
    'IMAGE_STORAGE_DIRECTORY deve apontar para um diretório próprio, com modo 0700, fora do projeto e sem links simbólicos.',
  );
}
