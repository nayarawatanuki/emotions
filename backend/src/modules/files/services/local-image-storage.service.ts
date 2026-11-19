import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { open, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { imagePolicy } from './image-policy.js';
import type { NormalizedImage } from './image-processor.service.js';

const storageKeyPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/u;

export function isImageStorageKey(key: string): boolean {
  return key.length === 41 && storageKeyPattern.test(key);
}

export class LocalImageStorageService {
  constructor(private readonly directory: string) {}

  async save(image: NormalizedImage): Promise<string> {
    if (
      image.bytes.length === 0 ||
      image.bytes.length > imagePolicy.maxOutputBytes
    ) {
      throw new Error('Invalid normalized image size.');
    }

    const key = `${randomUUID()}.webp`;
    const destination = this.filePath(key);
    const temporary = join(this.directory, `.${key}.tmp`);
    const handle = await open(temporary, 'wx', 0o600);
    try {
      try {
        await handle.writeFile(image.bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, destination);
    } catch (error) {
      try {
        await rm(temporary, { force: true });
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Could not save the image or remove its temporary file.',
        );
      }
      throw error;
    }
    return key;
  }

  async read(key: string): Promise<Buffer> {
    const handle = await open(
      this.filePath(key),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const file = await handle.stat();
      if (
        !file.isFile() ||
        file.size === 0 ||
        file.size > imagePolicy.maxOutputBytes
      ) {
        throw new Error('Invalid stored image.');
      }
      return await handle.readFile();
    } finally {
      await handle.close();
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.filePath(key), { force: true });
  }

  private filePath(key: string): string {
    if (!isImageStorageKey(key)) {
      throw new Error('Invalid image storage key.');
    }
    return join(this.directory, key);
  }
}
