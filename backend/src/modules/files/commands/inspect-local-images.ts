import type { DataSource } from 'typeorm';
import { readDatabaseEnvironment } from '../../../config/database-environment.js';
import {
  readImageStorageEnvironment,
  validateImageStorageDirectory,
} from '../../../config/image-storage-environment.js';
import { initializeDataSource } from '../../../database/database.module.js';
import { createDatabaseOptions } from '../../../database/database-options.js';
import { StoredFileEntity } from '../entities/stored-file.entity.js';
import { inspectImageStorage } from '../services/inspect-image-storage.js';

let source: DataSource | undefined;
try {
  const args = process.argv.slice(2);
  const simulate = args.length === 1 && args[0] === '--simulate-cleanup';
  if (args.length && !simulate) {
    throw new Error();
  }

  const database = readDatabaseEnvironment(process.env);
  const storage = readImageStorageEnvironment(process.env);
  if (
    !database ||
    !storage ||
    !['localhost', '127.0.0.1', '::1'].includes(database.host)
  ) {
    throw new Error();
  }

  const directory = await validateImageStorageDirectory(storage);
  source = await initializeDataSource(createDatabaseOptions(database));
  const records = await source
    .getRepository(StoredFileEntity)
    .createQueryBuilder('file')
    .select('file.storageKey', 'storageKey')
    .addSelect('file.archivedAt', 'archivedAt')
    .getRawMany<{ storageKey: string; archivedAt: Date | null }>();
  const counts = await inspectImageStorage(
    directory,
    records,
    simulate ? new Date() : undefined,
  );
  console.info(JSON.stringify(counts, null, 2));
} catch {
  console.error(
    'Não foi possível conferir os arquivos. Verifique os argumentos, o MySQL local, as migrations e o diretório privado.',
  );
  process.exitCode = 1;
} finally {
  try {
    await source?.destroy();
  } catch {
    console.error('Não foi possível encerrar a conexão de consulta.');
    process.exitCode = 1;
  }
}
