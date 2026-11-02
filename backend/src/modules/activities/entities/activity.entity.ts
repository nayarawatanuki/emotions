import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface Activity extends RecordFields {
  childId: string;
  professionalId: string;
  name: string;
  emotion: string;
  imageFileId: string;
  status: 'draft' | 'published' | 'archived';
  supportImageFileId: string | null;
  supportMessage: string | null;
  archivedAt: Date | null;
}

export const ActivityEntity = new EntitySchema<Activity>({
  name: 'Activity',
  tableName: 'activities',
  columns: {
    ...recordColumns,
    childId: { name: 'child_id', type: 'varchar', length: 36 },
    professionalId: { name: 'professional_id', type: 'varchar', length: 36 },
    name: { name: 'name', type: 'varchar', length: 255 },
    emotion: { name: 'emotion', type: 'varchar', length: 255 },
    imageFileId: { name: 'image_file_id', type: 'varchar', length: 36 },
    status: {
      name: 'status',
      type: 'enum',
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    supportImageFileId: {
      name: 'support_image_file_id',
      type: 'varchar',
      length: 36,
      nullable: true,
    },
    supportMessage: { name: 'support_message', type: 'text', nullable: true },
    archivedAt: {
      name: 'archived_at',
      type: 'datetime',
      nullable: true,
      precision: 6,
    },
  },
  indices: [
    {
      name: 'uq_activities_id_owner',
      columns: ['id', 'professionalId'],
      unique: true,
    },
    {
      name: 'ix_activities_child_owner',
      columns: ['childId', 'professionalId'],
      unique: false,
    },
    {
      name: 'ix_activities_image_owner',
      columns: ['imageFileId', 'professionalId'],
      unique: false,
    },
    {
      name: 'ix_activities_support_owner',
      columns: ['supportImageFileId', 'professionalId'],
      unique: false,
    },
  ],
  foreignKeys: [
    {
      name: 'fk_activities_child_owner',
      target: 'Child',
      columnNames: ['childId', 'professionalId'],
      referencedColumnNames: ['id', 'professionalId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_activities_image_owner',
      target: 'StoredFile',
      columnNames: ['imageFileId', 'professionalId'],
      referencedColumnNames: ['id', 'professionalId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_activities_support_owner',
      target: 'StoredFile',
      columnNames: ['supportImageFileId', 'professionalId'],
      referencedColumnNames: ['id', 'professionalId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [],
});
