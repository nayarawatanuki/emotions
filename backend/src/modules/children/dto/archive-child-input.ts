import { BadRequestException } from '@nestjs/common';

export interface ArchiveChildInput {
  archived: boolean;
  revision: string;
}

export function parseArchiveChildInput(body: unknown): ArchiveChildInput {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).length !== 2 ||
    !('archived' in body) ||
    typeof body.archived !== 'boolean' ||
    !('revision' in body) ||
    typeof body.revision !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.revision)
  )
    throw new BadRequestException();
  return { archived: body.archived, revision: body.revision };
}
