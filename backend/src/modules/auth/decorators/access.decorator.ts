import { SetMetadata } from '@nestjs/common';
import type { AccountRole } from '../auth.types.js';

export const PUBLIC_ROUTE = Symbol('PUBLIC_ROUTE');
export const ALLOWED_ROLES = Symbol('ALLOWED_ROLES');
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE, true);
export const AllowedRoles = (...roles: AccountRole[]) =>
  SetMetadata(ALLOWED_ROLES, roles);

export const WRITE_MEDIA_TYPES = Symbol('WRITE_MEDIA_TYPES');
export const WriteMediaTypes = (...types: string[]) =>
  SetMetadata(WRITE_MEDIA_TYPES, types);
