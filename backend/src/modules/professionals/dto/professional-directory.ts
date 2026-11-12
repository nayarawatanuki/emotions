import { BadRequestException } from '@nestjs/common';

export interface ProfessionalSummary {
  id: string;
  accountId: string;
  name: string;
  username: string;
  status: 'pending' | 'active' | 'suspended';
  archived: boolean;
}
export interface ProfessionalDirectory {
  items: ProfessionalSummary[];
  nextCursor: string | null;
}
export function parseDirectoryCursor(query: unknown): string | null {
  if (!query || typeof query !== 'object' || Array.isArray(query))
    throw new BadRequestException();
  const keys = Object.keys(query);
  if (keys.length === 0) return null;
  if (
    keys.length !== 1 ||
    keys[0] !== 'after' ||
    !('after' in query) ||
    typeof query.after !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      query.after,
    )
  )
    throw new BadRequestException();
  return query.after.toLowerCase();
}
