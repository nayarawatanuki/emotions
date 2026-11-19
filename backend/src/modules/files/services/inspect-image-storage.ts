import { lstat, opendir } from 'node:fs/promises';
import { join } from 'node:path';
import { isImageStorageKey } from './local-image-storage.service.js';

interface FileRecord {
  readonly storageKey: string;
  readonly archivedAt: Date | null;
}

const minimumCleanupAgeHours = 24;

export async function inspectImageStorage(
  directory: string,
  records: readonly FileRecord[],
  simulateAt?: Date,
) {
  const missingKeys = new Set(records.map((record) => record.storageKey));
  const counts = {
    temporaryFiles: 0,
    unregisteredFiles: 0,
    missingFiles: 0,
    archivedRecords: records.filter((record) => record.archivedAt !== null)
      .length,
  };

  const cleanup = {
    minimumAgeHours: minimumCleanupAgeHours,
    temporaryCandidates: 0,
    unregisteredCandidates: 0,
  };
  const cutoff = simulateAt
    ? simulateAt.getTime() - minimumCleanupAgeHours * 60 * 60 * 1000
    : undefined;

  for await (const entry of await opendir(directory)) {
    if (!entry.isFile()) continue;
    const { name } = entry;
    let category: 'temporary' | 'unregistered';
    if (isImageStorageKey(name)) {
      if (missingKeys.delete(name)) continue;
      counts.unregisteredFiles++;
      category = 'unregistered';
    } else if (
      name.startsWith('.') &&
      name.endsWith('.tmp') &&
      isImageStorageKey(name.slice(1, -4))
    ) {
      counts.temporaryFiles++;
      category = 'temporary';
    } else continue;

    if (cutoff === undefined) continue;
    const status = await lstat(join(directory, name));
    if (!status.isFile() || Math.max(status.mtimeMs, status.ctimeMs) > cutoff)
      continue;
    if (category === 'temporary') cleanup.temporaryCandidates++;
    else cleanup.unregisteredCandidates++;
  }

  counts.missingFiles = missingKeys.size;
  return simulateAt ? { ...counts, cleanupSimulation: cleanup } : counts;
}
