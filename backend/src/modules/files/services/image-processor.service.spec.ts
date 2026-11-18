import sharp from 'sharp';
import { ImageProcessorService } from './image-processor.service.js';
import { ImageProcessingError } from './image-processing-error.js';
import { imagePolicy } from './image-policy.js';

const create = (width = 8, height = 4) =>
  sharp({ create: { width, height, channels: 4, background: '#68bba480' } });

describe('ImageProcessorService using the installed native decoder', () => {
  const processor = new ImageProcessorService();
  let png: Buffer;
  beforeAll(async () => {
    png = await create().png().toBuffer();
  });

  it.each(['png', 'jpeg', 'webp'] as const)(
    'decodes %s and returns a small static WebP without enlarging it',
    async (format) => {
      const input = await create().toFormat(format).toBuffer();
      const original = Buffer.from(input);
      const result = await processor.normalize(input);
      expect(result).toMatchObject({
        mediaType: 'image/webp',
        width: 8,
        height: 4,
      });
      expect(input).toEqual(original);
      const metadata = await sharp(result.bytes).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.pages ?? 1).toBe(1);
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
    },
  );

  it('preserves transparent pixels losslessly at the original size', async () => {
    const pixels = Buffer.from([255, 0, 0, 255, 0, 255, 0, 128]);
    const input = await sharp(pixels, {
      raw: { width: 2, height: 1, channels: 4 },
    })
      .png()
      .toBuffer();
    const result = await processor.normalize(input);
    expect(await sharp(result.bytes).raw().toBuffer()).toEqual(pixels);
  });

  it('applies EXIF orientation before stripping private metadata and colour profiles', async () => {
    const input = await create(8, 4)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExifMerge({
        IFD0: {
          Artist: 'Synthetic private name',
          ImageDescription: 'Synthetic private note',
        },
      })
      .withXmp(
        '<x:xmpmeta xmlns:x="adobe:ns:meta/">Synthetic private metadata</x:xmpmeta>',
      )
      .toBuffer();
    const original = await sharp(input).metadata();
    expect(original.orientation).toBe(6);
    expect(original.exif).toBeDefined();
    expect(original.icc).toBeDefined();
    expect(original.xmp).toBeDefined();
    const result = await processor.normalize(input);
    expect(result).toMatchObject({ width: 4, height: 8 });
    const metadata = await sharp(result.bytes).metadata();
    for (const field of ['exif', 'icc', 'xmp', 'orientation'] as const)
      expect(metadata[field]).toBeUndefined();
    expect(result.bytes.includes(Buffer.from('Synthetic private'))).toBe(false);
  });

  it('fits within 2048 pixels preserving aspect ratio without cropping', async () => {
    const input = await create(3000, 1500).png().toBuffer();
    const result = await processor.normalize(input);
    expect(result).toMatchObject({ width: 2048, height: 1024 });
    expect(result.bytes.length).toBeLessThanOrEqual(imagePolicy.maxOutputBytes);
  });

  it.each([
    Buffer.alloc(0),
    Buffer.from([0xff, 0xd8, 0xff]),
    Buffer.from('RIFF0000WEBPbroken'),
  ])(
    'rejects invalid or truncated bytes without exposing decoder messages (%#)',
    async (input) => {
      await expect(processor.normalize(input)).rejects.toMatchObject({
        name: 'ImageProcessingError',
        code: 'invalid_image',
        message: 'Não foi possível validar a imagem.',
      });
      // Failed decodes release their capacity as well.
      expect((await processor.normalize(png)).width).toBe(8);
    },
  );

  it.each([
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/private"/></svg>',
    ),
    Buffer.from('GIF89a synthetic'),
    Buffer.from('%PDF-1.7 synthetic'),
    Buffer.from('pretend-image.jpg'),
  ])(
    'rejects formats outside the allowlist before decoding (%#)',
    async (input) => {
      await expect(processor.normalize(input)).rejects.toMatchObject({
        code: 'unsupported_image',
      });
    },
  );

  it('rejects oversized compressed input before decoding', async () => {
    await expect(
      processor.normalize(Buffer.alloc(imagePolicy.maxInputBytes + 1)),
    ).rejects.toMatchObject({ code: 'image_too_large' });
  });

  it.each([
    [4000, 3001],
    [8193, 1],
  ])('rejects excessive decoded dimensions %s by %s', async (width, height) => {
    const input = await create(width, height).png().toBuffer();
    await expect(processor.normalize(input)).rejects.toBeInstanceOf(
      ImageProcessingError,
    );
  });

  it('rejects animated WebP instead of silently selecting its first frame', async () => {
    const pixels = Buffer.from([
      255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255,
    ]);
    const input = await sharp(pixels, {
      raw: { width: 2, height: 2, channels: 4, pageHeight: 1 },
    })
      .webp({ lossless: true, loop: 0, delay: [100, 100] })
      .toBuffer();
    expect((await sharp(input).metadata()).pages).toBe(2);
    await expect(processor.normalize(input)).rejects.toMatchObject({
      code: 'unsupported_image',
    });
  });

  it('refuses an APNG animation-control chunk even when libpng would decode a static first frame', async () => {
    // Insert acTL after IHDR; it must be rejected before a native decode, even
    // with an invalid CRC. No untrusted APNG is treated as a static PNG.
    const chunk = Buffer.alloc(20);
    chunk.writeUInt32BE(8, 0);
    chunk.write('acTL', 4, 'ascii');
    chunk.writeUInt32BE(2, 8);
    const input = Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
    await expect(processor.normalize(input)).rejects.toMatchObject({
      code: 'unsupported_image',
    });
  });

  it('rejects truncated PNG chunks with bounded length arithmetic', async () => {
    const input = Buffer.from(png);
    input.writeUInt32BE(0xffffffff, 8);
    await expect(processor.normalize(input)).rejects.toMatchObject({
      code: 'invalid_image',
    });
  });

  it('allows two active jobs, rejects a third without a queue, and releases capacity', async () => {
    const service = new ImageProcessorService();
    const first = service.normalize(png);
    const second = service.normalize(png);
    await expect(service.normalize(png)).rejects.toMatchObject({
      code: 'image_capacity',
    });
    await Promise.all([first, second]);
    await expect(service.normalize(png)).resolves.toMatchObject({ width: 8 });
  });
  it('refuses an encoded output above the byte budget', async () => {
    // Deterministic noise compresses well as lossy JPEG but poorly as lossless
    // WebP. Exercise the output budget independently from the upload budget.
    const pixels = Buffer.alloc(1800 * 1800 * 3);
    let seed = 123456789;
    for (let index = 0; index < pixels.length; index++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      pixels[index] = seed & 255;
    }
    const input = await sharp(pixels, {
      raw: { width: 1800, height: 1800, channels: 3 },
    })
      .jpeg({ quality: 85 })
      .toBuffer();
    expect(input.length).toBeLessThan(imagePolicy.maxInputBytes);
    await expect(processor.normalize(input)).rejects.toMatchObject({
      code: 'image_too_large',
    });
  }, 15_000);

  it('sanitizes a native encoder failure and releases capacity for the next job', async () => {
    const failure = vi
      .spyOn(sharp.prototype, 'toBuffer')
      .mockRejectedValueOnce(
        new Error(
          'Synthetic native timeout /private/file.jpg private metadata',
        ),
      );
    try {
      await expect(processor.normalize(png)).rejects.toMatchObject({
        code: 'invalid_image',
        message: 'Não foi possível validar a imagem.',
      });
    } finally {
      failure.mockRestore();
    }
    await expect(processor.normalize(png)).resolves.toMatchObject({ width: 8 });
  });
});
