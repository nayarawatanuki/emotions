import { BadRequestException } from '@nestjs/common';
import { parseCreateChildInput } from './create-child-input.js';
import type { CreateChildInput } from './create-child-input.js';
export interface UpdateChildInput extends CreateChildInput {
  revision: string;
}
export function parseUpdateChildInput(body: unknown): UpdateChildInput {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !('revision' in body) ||
    typeof body.revision !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.revision)
  )
    throw new BadRequestException();
  const { revision, ...fields } = body;
  return { ...parseCreateChildInput(fields), revision };
}
