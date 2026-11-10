import { BadRequestException } from '@nestjs/common';
import { PasswordService } from '../services/password.service.js';
import { isOpaqueToken } from '../security/opaque-tokens.js';

export interface ActivationInput {
  token: string;
  password: string;
}
export function parseActivationInput(body: unknown): ActivationInput {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).sort().join(',') !== 'password,token' ||
    !('token' in body) ||
    !('password' in body) ||
    !isOpaqueToken(body.token) ||
    typeof body.password !== 'string'
  )
    throw new BadRequestException();
  try {
    new PasswordService().validate(body.password);
  } catch {
    throw new BadRequestException();
  }
  return { token: body.token, password: body.password };
}
