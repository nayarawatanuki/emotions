import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface StoredFile extends RecordFields {
  professionalId: string;
  storageKey: string;
  originalName: string | null;
  mediaType: string;
  sizeBytes: string;
  alternativeText: string | null;
  archivedAt: Date | null;
}

export const StoredFileEntity = new EntitySchema<StoredFile>({
  name: 'StoredFile',
  tableName: 'files',
  columns: {
    ...recordColumns,
    professionalId: { name: 'professional_id', type: 'varchar', length: 36 },
    storageKey: {
      name: 'storage_key',
      type: 'varchar',
      length: 255,
      select: false,
    },
    originalName: {
      name: 'original_name',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    mediaType: { name: 'media_type', type: 'varchar', length: 100 },
    sizeBytes: { name: 'size_bytes', type: 'bigint', unsigned: true },
    alternativeText: {
      name: 'alternative_text',
      type: 'varchar',
      length: 255,
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
    { name: 'uq_files_storage_key', columns: ['storageKey'], unique: true },
    {
      name: 'uq_files_id_owner',
      columns: ['id', 'professionalId'],
      unique: true,
    },
    { name: 'ix_files_owner', columns: ['professionalId'], unique: false },
  ],
  foreignKeys: [
    {
      name: 'fk_files_professional',
      target: 'Professional',
      columnNames: ['professionalId'],
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [{ name: 'ck_files_positive_size', expression: 'size_bytes > 0' }],
});
