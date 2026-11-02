import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface ActivityOption extends RecordFields {
  activityId: string;
  position: number;
  label: string;
  isCorrect: boolean;
  correctActivityId: string | null;
}

export const ActivityOptionEntity = new EntitySchema<ActivityOption>({
  name: 'ActivityOption',
  tableName: 'activity_options',
  columns: {
    ...recordColumns,
    activityId: { name: 'activity_id', type: 'varchar', length: 36 },
    position: { name: 'position', type: 'tinyint', unsigned: true },
    label: { name: 'label', type: 'varchar', length: 255 },
    isCorrect: { name: 'is_correct', type: 'boolean', default: false },
    correctActivityId: {
      name: 'correct_activity_id',
      type: 'varchar',
      length: 36,
      nullable: true,
      asExpression: 'CASE WHEN is_correct = 1 THEN activity_id ELSE NULL END',
      generatedType: 'STORED',
      insert: false,
      update: false,
    },
  },
  indices: [
    {
      name: 'uq_options_activity_position',
      columns: ['activityId', 'position'],
      unique: true,
    },
    {
      name: 'uq_options_activity_id',
      columns: ['activityId', 'id'],
      unique: true,
    },
    {
      name: 'uq_options_one_correct',
      columns: ['correctActivityId'],
      unique: true,
    },
  ],
  foreignKeys: [
    {
      name: 'fk_options_activity',
      target: 'Activity',
      columnNames: ['activityId'],
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [
    { name: 'ck_options_position', expression: 'position BETWEEN 1 AND 3' },
    { name: 'ck_options_correct_boolean', expression: 'is_correct IN (0, 1)' },
  ],
});
