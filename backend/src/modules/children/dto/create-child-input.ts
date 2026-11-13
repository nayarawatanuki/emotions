import { BadRequestException } from '@nestjs/common';

export interface CreateChildInput {
  name: string;
  username: string;
  dateOfBirth: string;
  guardianName: string;
  treatmentActive: boolean;
  reportedLevel: string | null;
  notes: string | null;
}
function label(value: unknown, optional = false): string | null {
  if (optional && value === null) return null;
  if (typeof value !== 'string' || value.length > 510)
    throw new BadRequestException();
  const text = value.trim();
  if (
    Array.from(text).length > 255 ||
    /[\p{Cc}\p{Cs}]/u.test(text) ||
    (!optional && !text)
  )
    throw new BadRequestException();
  return text || null;
}
export function isCivilDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + 'T00:00:00Z');
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function parseCreateChildInput(body: unknown): CreateChildInput {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).sort().join(',') !==
      'dateOfBirth,guardianName,name,notes,reportedLevel,treatmentActive,username' ||
    !('name' in body) ||
    !('username' in body) ||
    !('dateOfBirth' in body) ||
    !('guardianName' in body) ||
    !('treatmentActive' in body) ||
    !('reportedLevel' in body) ||
    !('notes' in body) ||
    typeof body.treatmentActive !== 'boolean' ||
    !isCivilDate(body.dateOfBirth)
  )
    throw new BadRequestException();
  const username = label(
    typeof body.username === 'string'
      ? body.username.toLowerCase()
      : body.username,
  );
  let notes: string | null = null;
  if (body.notes !== null) {
    if (
      typeof body.notes !== 'string' ||
      body.notes.length > 4000 ||
      Array.from(body.notes).length > 2000 ||
      Array.from(body.notes).some(
        (character) =>
          !['\n', '\r', '\t'].includes(character) &&
          /[\p{Cc}\p{Cs}]/u.test(character),
      )
    )
      throw new BadRequestException();
    notes = body.notes.trim() || null;
  }
  return {
    name: label(body.name)!,
    username: username!,
    dateOfBirth: body.dateOfBirth,
    guardianName: label(body.guardianName)!,
    treatmentActive: body.treatmentActive,
    reportedLevel: label(body.reportedLevel, true),
    notes,
  };
}
