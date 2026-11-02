import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface AccountToken extends RecordFields {
  accountId: string;
  accountRole: 'administrator' | 'professional' | 'child';
  issuedByAccountId: string;
  issuedByRole: 'administrator' | 'professional' | 'child';
  purpose: 'activation' | 'password_reset';
  tokenDigest: string;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
}

export const AccountTokenEntity = new EntitySchema<AccountToken>({
  name: 'AccountToken',
  tableName: 'account_tokens',
  columns: {
    ...recordColumns,
    accountId: { name: 'account_id', type: 'varchar', length: 36 },
    accountRole: {
      name: 'account_role',
      type: 'enum',
      enum: ['administrator', 'professional', 'child'],
      default: 'professional',
    },
    issuedByAccountId: {
      name: 'issued_by_account_id',
      type: 'varchar',
      length: 36,
    },
    issuedByRole: {
      name: 'issued_by_role',
      type: 'enum',
      enum: ['administrator', 'professional', 'child'],
      default: 'administrator',
    },
    purpose: {
      name: 'purpose',
      type: 'enum',
      enum: ['activation', 'password_reset'],
    },
    tokenDigest: {
      name: 'token_digest',
      type: 'char',
      length: 64,
      charset: 'ascii',
      collation: 'ascii_bin',
      select: false,
    },
    expiresAt: { name: 'expires_at', type: 'datetime', precision: 6 },
    consumedAt: {
      name: 'consumed_at',
      type: 'datetime',
      precision: 6,
      nullable: true,
    },
    revokedAt: {
      name: 'revoked_at',
      type: 'datetime',
      precision: 6,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'uq_account_tokens_digest',
      columns: ['tokenDigest'],
      unique: true,
    },
    {
      name: 'ix_account_tokens_account_purpose',
      columns: ['accountId', 'accountRole', 'purpose'],
    },
    {
      name: 'ix_account_tokens_issuer',
      columns: ['issuedByAccountId', 'issuedByRole'],
    },
    { name: 'ix_account_tokens_expiry', columns: ['expiresAt'] },
  ],
  foreignKeys: [
    {
      name: 'fk_account_tokens_professional',
      target: 'Account',
      columnNames: ['accountId', 'accountRole'],
      referencedColumnNames: ['id', 'role'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_account_tokens_issuer',
      target: 'Account',
      columnNames: ['issuedByAccountId', 'issuedByRole'],
      referencedColumnNames: ['id', 'role'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [
    {
      name: 'ck_account_tokens_roles',
      expression:
        "account_role = 'professional' AND issued_by_role = 'administrator'",
    },
    {
      name: 'ck_account_tokens_digest_length',
      expression: 'CHAR_LENGTH(token_digest) = 64',
    },
    {
      name: 'ck_account_tokens_times',
      expression:
        'expires_at > created_at AND (consumed_at IS NULL OR (consumed_at >= created_at AND consumed_at <= expires_at)) AND (revoked_at IS NULL OR revoked_at >= created_at) AND (consumed_at IS NULL OR revoked_at IS NULL)',
    },
  ],
});
