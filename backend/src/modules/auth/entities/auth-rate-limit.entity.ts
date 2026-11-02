import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface AuthRateLimit extends RecordFields {
  scope: 'login_origin' | 'login_origin_account' | 'token_redemption';
  keyDigest: string;
  windowStartedAt: Date;
  windowExpiresAt: Date;
  attemptCount: number;
  blockedUntil: Date | null;
}

export const AuthRateLimitEntity = new EntitySchema<AuthRateLimit>({
  name: 'AuthRateLimit',
  tableName: 'auth_rate_limits',
  columns: {
    ...recordColumns,
    scope: {
      name: 'scope',
      type: 'enum',
      enum: ['login_origin', 'login_origin_account', 'token_redemption'],
    },
    keyDigest: {
      name: 'key_digest',
      type: 'char',
      length: 64,
      charset: 'ascii',
      collation: 'ascii_bin',
      select: false,
    },
    windowStartedAt: {
      name: 'window_started_at',
      type: 'datetime',
      precision: 6,
    },
    windowExpiresAt: {
      name: 'window_expires_at',
      type: 'datetime',
      precision: 6,
    },
    attemptCount: {
      name: 'attempt_count',
      type: 'int',
      unsigned: true,
      default: 0,
    },
    blockedUntil: {
      name: 'blocked_until',
      type: 'datetime',
      precision: 6,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'uq_auth_rate_limits_scope_key',
      columns: ['scope', 'keyDigest'],
      unique: true,
    },
    { name: 'ix_auth_rate_limits_expiry', columns: ['windowExpiresAt'] },
    { name: 'ix_auth_rate_limits_blocked_until', columns: ['blockedUntil'] },
  ],
  checks: [
    {
      name: 'ck_auth_rate_limits_digest_length',
      expression: 'CHAR_LENGTH(key_digest) = 64',
    },
    {
      name: 'ck_auth_rate_limits_times',
      expression:
        'window_expires_at > window_started_at AND (blocked_until IS NULL OR blocked_until >= window_started_at)',
    },
  ],
});
