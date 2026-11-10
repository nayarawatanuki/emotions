import { BadRequestException } from '@nestjs/common';

export interface CreateProfessionalInput {
  name: string;
  username: string;
}
function label(value: unknown, lowercase: boolean): string {
  if (typeof value !== 'string' || value.length > 510)
    throw new BadRequestException();
  const normalized = lowercase ? value.trim().toLowerCase() : value.trim();
  if (
    !normalized ||
    Array.from(normalized).length > 255 ||
    /[\p{Cc}\p{Cs}]/u.test(normalized)
  )
    throw new BadRequestException();
  return normalized;
}
export function parseCreateProfessionalInput(
  body: unknown,
): CreateProfessionalInput {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).sort().join(',') !== 'name,username' ||
    !('name' in body) ||
    !('username' in body)
  )
    throw new BadRequestException();
  return {
    name: label(body.name, false),
    username: label(body.username, true),
  };
}
export function assertEmptyInvitationInput(body: unknown): void {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).length !== 0
  )
    throw new BadRequestException();
}
