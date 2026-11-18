import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import express from 'express';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { RateLimitException } from '../../../common/exceptions/rate-limit.exception.js';
import type { SessionContext } from '../../auth/auth.types.js';
import { StoredFileEntity } from '../../files/entities/stored-file.entity.js';
import {
  imagePolicy,
  uploadImageMediaTypes,
} from '../../files/services/image-policy.js';
import { ImageProcessingError } from '../../files/services/image-processing-error.js';
import { ImageProcessorService } from '../../files/services/image-processor.service.js';
import { LocalImageStorageService } from '../../files/services/local-image-storage.service.js';
import { ChildrenService } from './children.service.js';

const windowMs = 60_000;
const bodyDeadlineMs = 15_000;
const maxUploads = 6;
const maxTrackedProfessionals = 1024;
const readImage = express.raw({
  type: uploadImageMediaTypes,
  limit: imagePolicy.maxInputBytes,
  inflate: false,
});

@Injectable()
export class ChildPhotoUploadService {
  private readonly processor = new ImageProcessorService();
  private readonly counters = new Map<
    string,
    { expires: number; count: number }
  >();
  private active = 0;

  constructor(
    @Inject(ChildrenService) private readonly children: ChildrenService,
    @Inject(DataSource) private readonly source: DataSource,
    @Optional()
    @Inject(LocalImageStorageService)
    private readonly storage?: LocalImageStorageService,
  ) {}

  async upload(context: SessionContext, childId: string, request: Request) {
    if (!this.storage) throw new NotFoundException();
    const revision =
      request.headers['if-match']?.match(/^"([a-f0-9]{64})"$/u)?.[1];
    if (!revision) throw new BadRequestException();

    this.consume(context.user.id);
    this.active++;
    try {
      const child = await this.children.detail(context, childId);
      if (child.archived || child.revision !== revision)
        throw new ConflictException();

      const deadline = setTimeout(() => request.destroy(), bodyDeadlineMs);
      try {
        await new Promise<void>((resolve, reject) => {
          readImage(request, request.res!, (error?: unknown) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } finally {
        clearTimeout(deadline);
      }
      const bytes: unknown = request.body;
      if (!Buffer.isBuffer(bytes)) throw new BadRequestException();
      const image = await this.processor.normalize(bytes);
      const id = randomUUID();
      const storageKey = await this.storage.save(image);
      try {
        return await this.children.associatePhoto(context, childId, revision, {
          id,
          storageKey,
          mediaType: image.mediaType,
          sizeBytes: String(image.bytes.length),
        });
      } catch (error) {
        // A lost connection can leave the commit result ambiguous. Preserve the
        // bytes if the row exists or the database cannot confirm its absence.
        if (
          !(await this.source.getRepository(StoredFileEntity).existsBy({ id }))
        )
          await this.storage.remove(storageKey);
        throw error;
      }
    } catch (error) {
      if (!(error instanceof ImageProcessingError)) throw error;
      switch (error.code) {
        case 'invalid_image':
          throw new BadRequestException();
        case 'unsupported_image':
          throw new UnsupportedMediaTypeException();
        case 'image_too_large':
          throw new PayloadTooLargeException();
        case 'image_capacity':
          throw new RateLimitException(1);
      }
    } finally {
      this.active--;
    }
  }

  private consume(professionalId: string): void {
    if (this.active >= imagePolicy.maxConcurrent)
      throw new RateLimitException(1);
    const now = Date.now();
    for (const [id, counter] of this.counters) {
      if (counter.expires <= now) this.counters.delete(id);
    }
    const counter = this.counters.get(professionalId);
    if (counter) {
      if (counter.count >= maxUploads)
        throw new RateLimitException((counter.expires - now) / 1000);
      counter.count++;
      return;
    }
    if (this.counters.size >= maxTrackedProfessionals)
      throw new RateLimitException(windowMs / 1000);
    this.counters.set(professionalId, { expires: now + windowMs, count: 1 });
  }
}
