import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface ActivityAttempt extends RecordFields {
  resultId: string;
  activityId: string;
  selectedOptionId: string;
  attemptNumber: number;
  operationId: string;
  startedAt: Date;
  answeredAt: Date;
  durationSeconds: string;
  timingSource: 'server_elapsed' | 'client_active';
  isCorrect: boolean;
}

export const ActivityAttemptEntity = new EntitySchema<ActivityAttempt>({
  name: 'ActivityAttempt',
  tableName: 'activity_attempts',
  columns: {
    ...recordColumns,
    resultId: { name: 'result_id', type: 'varchar', length: 36 },
    activityId: { name: 'activity_id', type: 'varchar', length: 36 },
    selectedOptionId: {
      name: 'selected_option_id',
      type: 'varchar',
      length: 36,
    },
    attemptNumber: { name: 'attempt_number', type: 'tinyint', unsigned: true },
    operationId: { name: 'operation_id', type: 'varchar', length: 36 },
    startedAt: { name: 'started_at', type: 'datetime', precision: 6 },
    answeredAt: { name: 'answered_at', type: 'datetime', precision: 6 },
    durationSeconds: {
      name: 'duration_seconds',
      type: 'bigint',
      unsigned: true,
    },
    timingSource: {
      name: 'timing_source',
      type: 'enum',
      enum: ['server_elapsed', 'client_active'],
    },
    isCorrect: { name: 'is_correct', type: 'boolean' },
  },
  indices: [
    {
      name: 'uq_attempts_result_number',
      columns: ['resultId', 'attemptNumber'],
      unique: true,
    },
    {
      name: 'uq_attempts_operation',
      columns: ['resultId', 'operationId'],
      unique: true,
    },
    {
      name: 'ix_attempts_result_activity',
      columns: ['resultId', 'activityId'],
      unique: false,
    },
    {
      name: 'ix_attempts_activity_option',
      columns: ['activityId', 'selectedOptionId'],
      unique: false,
    },
  ],
  foreignKeys: [
    {
      name: 'fk_attempts_result_activity',
      target: 'ActivityResult',
      columnNames: ['resultId', 'activityId'],
      referencedColumnNames: ['id', 'activityId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_attempts_selected_option',
      target: 'ActivityOption',
      columnNames: ['activityId', 'selectedOptionId'],
      referencedColumnNames: ['activityId', 'id'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [
    {
      name: 'ck_attempts_number',
      expression: 'attempt_number BETWEEN 1 AND 3',
    },
    { name: 'ck_attempts_dates', expression: 'answered_at >= started_at' },
    { name: 'ck_attempts_correct_boolean', expression: 'is_correct IN (0, 1)' },
  ],
});
