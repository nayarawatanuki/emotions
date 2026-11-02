import type { EntitySchemaColumnOptions } from 'typeorm';

export interface RecordFields {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const recordColumns = {
  id: { type: 'varchar', length: 36, primary: true, generated: 'uuid' },
  createdAt: {
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    createDate: true,
    default: () => 'CURRENT_TIMESTAMP(6)',
  },
  updatedAt: {
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    updateDate: true,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  },
} satisfies Record<keyof RecordFields, EntitySchemaColumnOptions>;
