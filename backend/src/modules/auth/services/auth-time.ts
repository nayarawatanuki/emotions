import type { EntityManager } from 'typeorm';

export async function databaseNow(manager: EntityManager): Promise<Date> {
  const rows: unknown = await manager.query('SELECT UTC_TIMESTAMP(6) AS now');
  const row: unknown = Array.isArray(rows) ? rows[0] : undefined;
  if (
    !row ||
    typeof row !== 'object' ||
    !('now' in row) ||
    !(row.now instanceof Date) ||
    !Number.isFinite(row.now.getTime())
  )
    throw new Error('Não foi possível obter o horário da autenticação.');
  return row.now;
}
