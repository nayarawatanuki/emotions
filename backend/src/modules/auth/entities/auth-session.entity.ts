import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface AuthSession extends RecordFields {
  accountId: string;
  sessionDigest: string;
  lastSeenAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export const AuthSessionEntity = new EntitySchema<AuthSession>({
  name: 'AuthSession',
  tableName: 'auth_sessions',
  columns: {
    ...recordColumns,
    accountId: { name: 'account_id', type: 'varchar', length: 36 },
    sessionDigest: {
      name: 'session_digest',
      type: 'char',
      length: 64,
      charset: 'ascii',
      collation: 'ascii_bin',
      select: false,
    },
    lastSeenAt: {
      name: 'last_seen_at',
      type: 'datetime',
      precision: 6,
      default: () => 'CURRENT_TIMESTAMP(6)',
    },
    idleExpiresAt: { name: 'idle_expires_at', type: 'datetime', precision: 6 },
    expiresAt: { name: 'expires_at', type: 'datetime', precision: 6 },
    revokedAt: {
      name: 'revoked_at',
      type: 'datetime',
      precision: 6,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'uq_auth_sessions_digest',
      columns: ['sessionDigest'],
      unique: true,
    },
    { name: 'ix_auth_sessions_account', columns: ['accountId'] },
    { name: 'ix_auth_sessions_expiry', columns: ['expiresAt'] },
    { name: 'ix_auth_sessions_idle_expiry', columns: ['idleExpiresAt'] },
  ],
  foreignKeys: [
    {
      name: 'fk_auth_sessions_account',
      target: 'Account',
      columnNames: ['accountId'],
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [
    {
      name: 'ck_auth_sessions_digest_length',
      expression: 'CHAR_LENGTH(session_digest) = 64',
    },
    {
      name: 'ck_auth_sessions_times',
      expression:
        'last_seen_at >= created_at AND idle_expires_at > last_seen_at AND idle_expires_at <= expires_at AND expires_at > created_at AND (revoked_at IS NULL OR revoked_at >= created_at)',
    },
  ],
});
