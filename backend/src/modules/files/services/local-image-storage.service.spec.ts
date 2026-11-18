import { Test } from '@nestjs/testing';
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module.js';
import { readImageStorageEnvironment } from '../../../config/image-storage-environment.js';
import { LocalImageStorageService } from './local-image-storage.service.js';
import { ImageProcessorService } from './image-processor.service.js';
import sharp from 'sharp';

const failureId = '12345678-abcd-4123-abcd-123456789abc';
const { generateId } = vi.hoisted(() => ({
  generateId: vi.fn<() => string>(),
}));

vi.mock('node:crypto', async (importOriginal) => {
  const crypto = await importOriginal<typeof import('node:crypto')>();
  return { ...crypto, randomUUID: () => generateId() };
});

describe('Local image storage', () => {
  let directory: string;

  beforeEach(async () => {
    const { randomUUID } =
      await vi.importActual<typeof import('node:crypto')>('node:crypto');
    generateId.mockReset();
    generateId.mockImplementation(randomUUID);
    directory = await mkdtemp(
      join(await realpath(tmpdir()), 'emotions-images-test-'),
    );
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('stores normalized bytes privately and supports concurrent saves and retryable removal', async () => {
    const context = await Test.createTestingModule({
      imports: [AppModule.register({ IMAGE_STORAGE_DIRECTORY: directory })],
    }).compile();
    try {
      const storage = context.get(LocalImageStorageService);
      const png = await sharp({
        create: { width: 2, height: 2, channels: 3, background: 'red' },
      })
        .png()
        .toBuffer();
      const image = await new ImageProcessorService().normalize(png);
      const [first, second] = await Promise.all([
        storage.save(image),
        storage.save(image),
      ]);

      expect(first).not.toBe(second);
      expect(await readdir(directory)).toEqual(
        expect.arrayContaining([first, second]),
      );
      expect(await readdir(directory)).toHaveLength(2);
      expect((await stat(join(directory, first))).mode & 0o777).toBe(0o600);
      expect(await storage.read(first)).toEqual(image.bytes);
      await storage.remove(first);
      await storage.remove(first);
      await expect(storage.read(first)).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(await readdir(directory)).toEqual([second]);
    } finally {
      await context.close();
    }
  });

  it('removes the temporary file if publication fails', async () => {
    const storage = new LocalImageStorageService(directory);
    generateId.mockReturnValueOnce(failureId);
    const occupied = `${failureId}.webp`;
    await mkdir(join(directory, occupied));

    await expect(
      storage.save({
        bytes: Buffer.from('test'),
        mediaType: 'image/webp',
        width: 1,
        height: 1,
      }),
    ).rejects.toThrow();
    expect(await readdir(directory)).toEqual([occupied]);
  });

  it('rejects invalid keys and refuses to follow symbolic links when reading', async () => {
    const storage = new LocalImageStorageService(directory);
    await expect(storage.read('../outside.webp')).rejects.toThrow(
      'Invalid image storage key.',
    );
    await expect(storage.remove(`${failureId}.webp\n`)).rejects.toThrow(
      'Invalid image storage key.',
    );
    const key = `${failureId}.webp`;
    await symlink('/dev/null', join(directory, key));
    await expect(storage.read(key)).rejects.toMatchObject({ code: 'ELOOP' });
  });

  it('keeps storage opt-in and rejects relative paths and production configuration', () => {
    expect(readImageStorageEnvironment({})).toBeNull();
    expect(() =>
      readImageStorageEnvironment({ IMAGE_STORAGE_DIRECTORY: 'uploads' }),
    ).toThrow();
    expect(() =>
      readImageStorageEnvironment({
        NODE_ENV: 'production',
        IMAGE_STORAGE_DIRECTORY: directory,
      }),
    ).toThrow();
  });

  it('rejects a directory accessible to other users or a symbolic link', async () => {
    const shared = join(directory, 'shared');
    const link = join(directory, 'link');
    await mkdir(shared);
    await chmod(shared, 0o750);
    await symlink(directory, link);
    for (const invalid of [shared, link, process.cwd()]) {
      await expect(
        Test.createTestingModule({
          imports: [AppModule.register({ IMAGE_STORAGE_DIRECTORY: invalid })],
        }).compile(),
      ).rejects.toThrow('IMAGE_STORAGE_DIRECTORY');
    }
  });
});
