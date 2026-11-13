import { BadRequestException } from '@nestjs/common';
import { parseUuidCursor } from '../../../common/validation/uuid-cursor.js';

export function parseChildDirectoryQuery(query: unknown): {
  after: string | null;
  archived: boolean;
} {
  if (!query || typeof query !== 'object' || Array.isArray(query))
    throw new BadRequestException();
  const { archived, ...cursor } = query as Record<string, unknown>;
  if ('archived' in query && archived !== 'true' && archived !== 'false')
    throw new BadRequestException();
  return { after: parseUuidCursor(cursor), archived: archived === 'true' };
}
