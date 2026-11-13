import { createHash } from 'node:crypto';
import type { ChildView } from '../dto/child-view.js';
export function childRevision(
  view: Omit<ChildView, 'revision'>,
  childUpdatedAt: string,
  accountUpdatedAt: string,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        'child-record-v1',
        view.id,
        view.name,
        view.username,
        view.dateOfBirth,
        view.treatmentActive,
        view.archived,
        view.guardianName,
        view.reportedLevel,
        view.notes,
        childUpdatedAt,
        accountUpdatedAt,
      ]),
    )
    .digest('hex');
}
