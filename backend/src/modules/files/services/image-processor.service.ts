import sharp from 'sharp';
import { imagePolicy } from './image-policy.js';
import { ImageProcessingError } from './image-processing-error.js';

export interface NormalizedImage {
  readonly bytes: Buffer;
  readonly mediaType: 'image/webp';
  readonly width: number;
  readonly height: number;
}

type ImageFormat = 'jpeg' | 'png' | 'webp';

function inputFormat(bytes: Buffer): ImageFormat {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return 'jpeg';
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    // libpng can decode only the first frame of APNG. Reject its animation
    // control chunk explicitly instead of silently accepting it as a static PNG.
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      if (length > bytes.length - offset - 12)
        throw new ImageProcessingError('invalid_image');
      const chunk = bytes.toString('ascii', offset + 4, offset + 8);
      if (chunk === 'acTL') throw new ImageProcessingError('unsupported_image');
      if (chunk === 'IEND') return 'png';
      offset += length + 12;
    }
    throw new ImageProcessingError('invalid_image');
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'webp';
  throw new ImageProcessingError('unsupported_image');
}

// Kept independent of HTTP, persistence and Sharp types at the public boundary.
// The Files module will own a singleton when protected upload routes are added.
export class ImageProcessorService {
  private active = 0;

  async normalize(bytes: Buffer): Promise<NormalizedImage> {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0)
      throw new ImageProcessingError('invalid_image');
    if (bytes.length > imagePolicy.maxInputBytes)
      throw new ImageProcessingError('image_too_large');
    if (this.active >= imagePolicy.maxConcurrent)
      throw new ImageProcessingError('image_capacity');
    this.active++;
    let pipeline: ReturnType<typeof sharp> | undefined;
    try {
      const format = inputFormat(bytes);
      pipeline = sharp(bytes, {
        failOn: 'warning',
        limitInputPixels: imagePolicy.maxInputPixels,
        sequentialRead: true,
      }).timeout({ seconds: imagePolicy.timeoutSeconds });
      const metadata = await pipeline.metadata();
      if (
        metadata.format !== format ||
        (metadata.pages ?? 1) !== 1 ||
        metadata.loop !== undefined ||
        metadata.delay !== undefined
      )
        throw new ImageProcessingError('unsupported_image');
      if (!metadata.width || !metadata.height)
        throw new ImageProcessingError('invalid_image');
      if (
        metadata.width > imagePolicy.maxInputSide ||
        metadata.height > imagePolicy.maxInputSide ||
        metadata.width * metadata.height > imagePolicy.maxInputPixels
      )
        throw new ImageProcessingError('image_too_large');
      const { data, info } = await pipeline
        .rotate()
        .resize({
          width: imagePolicy.maxOutputSide,
          height: imagePolicy.maxOutputSide,
          fit: 'inside',
          withoutEnlargement: true,
        })
        // No keepMetadata/withMetadata: user metadata is deliberately discarded.
        .webp({ lossless: true, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      if (data.length > imagePolicy.maxOutputBytes)
        throw new ImageProcessingError('image_too_large');
      return {
        bytes: data,
        mediaType: 'image/webp',
        width: info.width,
        height: info.height,
      };
    } catch (error) {
      if (error instanceof ImageProcessingError) throw error;
      // Native decoder messages may contain input details; do not expose them.
      throw new ImageProcessingError('invalid_image');
    } finally {
      pipeline?.destroy();
      this.active--;
    }
  }
}
