import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface Professional extends RecordFields {
  accountId: string;
  accountRole: 'administrator' | 'professional' | 'child';
  createdByAccountId: string;
  createdByRole: 'administrator' | 'professional' | 'child';
  archivedAt: Date | null;
}

export const ProfessionalEntity = new EntitySchema<Professional>({
  name: 'Professional',
  tableName: 'professionals',
  columns: {
    ...recordColumns,
    accountId: { name: 'account_id', type: 'varchar', length: 36 },
    accountRole: {
      name: 'account_role',
      type: 'enum',
      enum: ['administrator', 'professional', 'child'],
      default: 'professional',
    },
    createdByAccountId: {
      name: 'created_by_account_id',
      type: 'varchar',
      length: 36,
    },
    createdByRole: {
      name: 'created_by_role',
      type: 'enum',
      enum: ['administrator', 'professional', 'child'],
      default: 'administrator',
    },
    archivedAt: {
      name: 'archived_at',
      type: 'datetime',
      nullable: true,
      precision: 6,
    },
  },
  indices: [
    { name: 'uq_professionals_account', columns: ['accountId'], unique: true },
    {
      name: 'ix_professionals_created_by',
      columns: ['createdByAccountId', 'createdByRole'],
      unique: false,
    },
  ],
  foreignKeys: [
    {
      name: 'fk_professionals_account_role',
      target: 'Account',
      columnNames: ['accountId', 'accountRole'],
      referencedColumnNames: ['id', 'role'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_professionals_created_by_admin',
      target: 'Account',
      columnNames: ['createdByAccountId', 'createdByRole'],
      referencedColumnNames: ['id', 'role'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [
    {
      name: 'ck_professionals_role',
      expression: "account_role = 'professional'",
    },
    {
      name: 'ck_professionals_creator_role',
      expression: "created_by_role = 'administrator'",
    },
  ],
});
