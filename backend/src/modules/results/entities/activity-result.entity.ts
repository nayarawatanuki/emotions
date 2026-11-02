import { EntitySchema } from 'typeorm';
import { recordColumns } from '../../../database/record-columns.js';
import type { RecordFields } from '../../../database/record-columns.js';

export interface ActivityResult extends RecordFields {
  activityId: string;
  professionalId: string;
  sequence: number;
  status: 'ready' | 'in_progress' | 'completed';
  startedAt: Date | null;
  completedAt: Date | null;
  outcome: 'correct' | 'attempts_exhausted' | null;
  repeatOfResultId: string | null;
  resetOperationId: string | null;
  openActivityId: string | null;
}

export const ActivityResultEntity = new EntitySchema<ActivityResult>({
  name: 'ActivityResult',
  tableName: 'activity_results',
  columns: {
    ...recordColumns,
    activityId: { name: 'activity_id', type: 'varchar', length: 36 },
    professionalId: { name: 'professional_id', type: 'varchar', length: 36 },
    sequence: { name: 'sequence', type: 'int', unsigned: true },
    status: {
      name: 'status',
      type: 'enum',
      enum: ['ready', 'in_progress', 'completed'],
      default: 'ready',
    },
    outcome: {
      name: 'outcome',
      type: 'enum',
      enum: ['correct', 'attempts_exhausted'],
      nullable: true,
    },
    startedAt: {
      name: 'started_at',
      type: 'datetime',
      nullable: true,
      precision: 6,
    },
    completedAt: {
      name: 'completed_at',
      type: 'datetime',
      nullable: true,
      precision: 6,
    },
    repeatOfResultId: {
      name: 'repeat_of_result_id',
      type: 'varchar',
      length: 36,
      nullable: true,
    },
    resetOperationId: {
      name: 'reset_operation_id',
      type: 'varchar',
      length: 36,
      nullable: true,
    },
    openActivityId: {
      name: 'open_activity_id',
      type: 'varchar',
      length: 36,
      nullable: true,
      asExpression:
        "CASE WHEN status IN ('ready', 'in_progress') THEN activity_id ELSE NULL END",
      generatedType: 'STORED',
      insert: false,
      update: false,
    },
  },
  indices: [
    {
      name: 'uq_activity_results_id_activity',
      columns: ['id', 'activityId'],
      unique: true,
    },
    {
      name: 'uq_activity_results_sequence',
      columns: ['activityId', 'sequence'],
      unique: true,
    },
    {
      name: 'uq_activity_results_one_open',
      columns: ['openActivityId'],
      unique: true,
    },
    {
      name: 'uq_activity_results_reset_operation',
      columns: ['activityId', 'resetOperationId'],
      unique: true,
    },
    {
      name: 'uq_activity_results_repeat_source',
      columns: ['repeatOfResultId'],
      unique: true,
    },
    {
      name: 'ix_activity_results_activity_owner',
      columns: ['activityId', 'professionalId'],
      unique: false,
    },
    {
      name: 'ix_activity_results_repeat_activity',
      columns: ['repeatOfResultId', 'activityId'],
      unique: false,
    },
  ],
  foreignKeys: [
    {
      name: 'fk_activity_results_activity_owner',
      target: 'Activity',
      columnNames: ['activityId', 'professionalId'],
      referencedColumnNames: ['id', 'professionalId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
    {
      name: 'fk_activity_results_repeat_activity',
      target: 'ActivityResult',
      columnNames: ['repeatOfResultId', 'activityId'],
      referencedColumnNames: ['id', 'activityId'],
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  ],
  checks: [
    {
      name: 'ck_activity_results_outcome',
      expression:
        "(status = 'completed' AND outcome IS NOT NULL) OR (status <> 'completed' AND outcome IS NULL)",
    },
    { name: 'ck_activity_results_sequence', expression: 'sequence >= 1' },
    {
      name: 'ck_activity_results_timestamps',
      expression:
        "(status = 'ready' AND started_at IS NULL AND completed_at IS NULL) OR (status = 'in_progress' AND started_at IS NOT NULL AND completed_at IS NULL) OR (status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at)",
    },
    {
      name: 'ck_activity_results_repeat',
      expression:
        '(sequence = 1 AND repeat_of_result_id IS NULL AND reset_operation_id IS NULL) OR (sequence > 1 AND repeat_of_result_id IS NOT NULL AND reset_operation_id IS NOT NULL)',
    },
  ],
});
