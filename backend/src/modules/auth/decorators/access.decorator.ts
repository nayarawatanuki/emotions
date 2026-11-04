import { SetMetadata } from '@nestjs/common';
import type { AdultRole } from '../auth.types.js';

export const PUBLIC_ROUTE = Symbol('PUBLIC_ROUTE');
export const ALLOWED_ROLES = Symbol('ALLOWED_ROLES');
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE, true);
export const AllowedRoles = (...roles: AdultRole[]) =>
  SetMetadata(ALLOWED_ROLES, roles);
