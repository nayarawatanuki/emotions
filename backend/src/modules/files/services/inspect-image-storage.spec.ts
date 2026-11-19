import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectImageStorage } from './inspect-image-storage.js';

it('counts archived records, missing files, orphans and temporary files without changing the directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'emotions-inspect-'));
  try {
    const registered = `${randomUUID()}.webp`;
    const orphan = `${randomUUID()}.webp`;
    const temporary = `.${randomUUID()}.webp.tmp`;
    const missing = `${randomUUID()}.webp`;
    const ignoredDirectory = `${randomUUID()}.webp`;
    for (const name of [registered, orphan, temporary, 'unrecognized.webp'])
      await writeFile(join(directory, name), 'synthetic');
    await mkdir(join(directory, ignoredDirectory));
    await symlink(registered, join(directory, missing));
    const before = await readdir(directory);

    await expect(
      inspectImageStorage(directory, [
        { storageKey: registered, archivedAt: new Date(0) },
        { storageKey: missing, archivedAt: null },
      ]),
    ).resolves.toEqual({
      temporaryFiles: 1,
      unregisteredFiles: 1,
      missingFiles: 1,
      archivedRecords: 1,
    });

    expect(await readdir(directory)).toEqual(before);
    expect(await readFile(join(directory, orphan), 'utf8')).toBe('synthetic');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
