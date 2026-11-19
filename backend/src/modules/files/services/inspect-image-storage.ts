import { opendir } from 'node:fs/promises';
import { isImageStorageKey } from './local-image-storage.service.js';

interface FileRecord {
  readonly storageKey: string;
  readonly archivedAt: Date | null;
}

export async function inspectImageStorage(
  directory: string,
  records: readonly FileRecord[],
) {
  const missingKeys = new Set(records.map((record) => record.storageKey));
  const counts = {
    temporaryFiles: 0,
    unregisteredFiles: 0,
    missingFiles: 0,
    archivedRecords: records.filter((record) => record.archivedAt !== null)
      .length,
  };

  for await (const entry of await opendir(directory)) {
    if (!entry.isFile()) continue;
    const { name } = entry;
    if (isImageStorageKey(name)) {
      if (!missingKeys.delete(name)) counts.unregisteredFiles++;
    } else if (
      name.startsWith('.') &&
      name.endsWith('.tmp') &&
      isImageStorageKey(name.slice(1, -4))
    ) {
      counts.temporaryFiles++;
    }
  }

  counts.missingFiles = missingKeys.size;
  return counts;
}
