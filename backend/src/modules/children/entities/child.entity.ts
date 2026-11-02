import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface Child extends RecordFields {
  professionalId: string;
  accountId: string;
  accountRole: 'administrator' | 'professional' | 'child';
  treatmentActive: boolean;
  reportedLevel: string | null;
  dateOfBirth: string;
  guardianName: string;
  notes: string | null;
  photoFileId: string | null;
  archivedAt: Date | null;
}

export const ChildEntity = new EntitySchema<Child>({
  name: 'Child',
  tableName: 'children',
  columns: {
    ...recordColumns,
    professionalId: { name: 'professional_id', type: 'varchar', length: 36 },
    accountId: { name: 'account_id', type: 'varchar', length: 36 },
    accountRole: {
      name: 'account_role',
      type: 'enum',
      enum: ['administrator', 'professional', 'child'],
      default: 'child',
    },
    treatmentActive: {
      name: 'treatment_active',
      type: 'boolean',
      default: false,
    },
    reportedLevel: {
      name: 'reported_level',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    dateOfBirth: { name: 'date_of_birth', type: 'date' },
    guardianName: { name: 'guardian_name', type: 'varchar', length: 255 },
    notes: { name: 'notes', type: 'text', nullable: true },
    photoFileId: {
      name: 'photo_file_id',
      type: 'varchar',
      length: 36,
      nullable: true,
    },
    archivedAt: {
      name: 'archived_at',
      type: 'datetime',
      nullable: true,
      precision: 6,
    },
  },
  indices: [
    { name: 'uq_children_account', columns: ['accountId'], unique: true },
    {
      name: 'uq_children_id_owner',
      columns: ['id', 'professionalId'],
      unique: true,
    },
    { name: 'ix_children_owner', columns: ['professionalId'], unique: false },
    {
      name: 'ix_children_photo_owner',
      columns: ['photoFileId', 'professionalId'],
      unique: false,
    },
  ],
  foreignKeys: [
    {
      name: 'fk_children_professional',
      target: 'Professional',
      columnNames: ['professionalId'],
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_children_account_role',
      target: 'Account',
      columnNames: ['accountId', 'accountRole'],
      referencedColumnNames: ['id', 'role'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_children_photo_owner',
      target: 'StoredFile',
      columnNames: ['photoFileId', 'professionalId'],
      referencedColumnNames: ['id', 'professionalId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [
    { name: 'ck_children_role', expression: "account_role = 'child'" },
    {
      name: 'ck_children_treatment_boolean',
      expression: 'treatment_active IN (0, 1)',
    },
  ],
});
