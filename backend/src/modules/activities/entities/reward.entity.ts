import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface Reward extends RecordFields {
  activityId: string;
  professionalId: string;
  imageFileId: string;
  message: string;
}

export const RewardEntity = new EntitySchema<Reward>({
  name: 'Reward',
  tableName: 'rewards',
  columns: {
    ...recordColumns,
    activityId: { name: 'activity_id', type: 'varchar', length: 36 },
    professionalId: { name: 'professional_id', type: 'varchar', length: 36 },
    imageFileId: { name: 'image_file_id', type: 'varchar', length: 36 },
    message: { name: 'message', type: 'text' },
  },
  indices: [
    { name: 'uq_rewards_activity', columns: ['activityId'], unique: true },
    {
      name: 'ix_rewards_activity_owner',
      columns: ['activityId', 'professionalId'],
      unique: false,
    },
    {
      name: 'ix_rewards_image_owner',
      columns: ['imageFileId', 'professionalId'],
      unique: false,
    },
  ],
  foreignKeys: [
    {
      name: 'fk_rewards_activity_owner',
      target: 'Activity',
      columnNames: ['activityId', 'professionalId'],
      referencedColumnNames: ['id', 'professionalId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_rewards_image_owner',
      target: 'StoredFile',
      columnNames: ['imageFileId', 'professionalId'],
      referencedColumnNames: ['id', 'professionalId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [],
});
