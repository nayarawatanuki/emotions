import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface Account extends RecordFields {
  name: string;
  username: string;
  passwordHash: string;
  role: 'administrator' | 'professional' | 'child';
  status: 'pending' | 'active' | 'suspended';
  lastSignedInAt: Date | null;
}

export const AccountEntity = new EntitySchema<Account>({
  name: 'Account',
  tableName: 'accounts',
  columns: {
    ...recordColumns,
    name: { name: 'name', type: 'varchar', length: 255 },
    username: {
      name: 'username',
      type: 'varchar',
      length: 255,
      collation: 'utf8mb4_0900_as_ci',
    },
    passwordHash: {
      name: 'password_hash',
      type: 'varchar',
      length: 255,
      select: false,
    },
    role: {
      name: 'role',
      type: 'enum',
      enum: ['administrator', 'professional', 'child'],
    },
    status: {
      name: 'status',
      type: 'enum',
      enum: ['pending', 'active', 'suspended'],
      default: 'pending',
    },
    lastSignedInAt: {
      name: 'last_signed_in_at',
      type: 'datetime',
      nullable: true,
      precision: 6,
    },
  },
  indices: [
    { name: 'uq_accounts_username', columns: ['username'], unique: true },
    { name: 'uq_accounts_id_role', columns: ['id', 'role'], unique: true },
  ],
  foreignKeys: [],
  checks: [
    {
      name: 'ck_accounts_normalized_username',
      expression:
        'CAST(username AS BINARY) = CAST(LOWER(TRIM(username)) AS BINARY) AND CHAR_LENGTH(username) > 0',
    },
  ],
});
