import { BadRequestException } from '@nestjs/common';
import { PasswordService } from '../services/password.service.js';

export interface LoginInput {
  username: string;
  password: string;
}
export function parseLoginInput(body: unknown): LoginInput {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).sort().join(',') !== 'password,username' ||
    !('username' in body) ||
    !('password' in body) ||
    typeof body.username !== 'string' ||
    typeof body.password !== 'string'
  )
    throw new BadRequestException();
  if (body.username.length > 510) throw new BadRequestException();
  const username = body.username.trim().toLowerCase();
  if (
    !username ||
    Array.from(username).length > 255 ||
    /[\p{Cc}\p{Cs}]/u.test(username)
  )
    throw new BadRequestException();
  try {
    new PasswordService().validate(body.password);
  } catch {
    throw new BadRequestException();
  }
  return { username, password: body.password };
}
