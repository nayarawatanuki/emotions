import { DataSource } from 'typeorm';
import { readDatabaseEnvironment } from '../../../config/database-environment.js';
import { readEnvironment } from '../../../config/environment.js';
import { createDatabaseOptions } from '../../../database/database-options.js';
import { PasswordPolicyError } from '../../auth/services/password.service.js';
import {
  CreateFirstAdminError,
  CreateFirstAdminService,
} from '../services/create-first-admin.service.js';
import { AdminInputError, readAdminInput } from './admin-input.js';

async function main(): Promise<void> {
  if (process.argv.length !== 2)
    throw new CreateFirstAdminError(
      'Não informe argumentos. Execute yarn admin:create-first em um terminal local.',
    );
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new CreateFirstAdminError(
      'Use um terminal interativo local; entrada redirecionada não é aceita.',
    );
  readEnvironment(process.env);
  const environment = readDatabaseEnvironment(process.env);
  if (!environment)
    throw new CreateFirstAdminError(
      'Configure DB_ENABLED e a conexão da aplicação antes de continuar.',
    );
  const input = await readAdminInput(process.stdin, process.stdout);
  const database = new DataSource(createDatabaseOptions(environment));
  try {
    await database.initialize();
    const runner = database.createQueryRunner();
    try {
      await runner.connect();
      await new CreateFirstAdminService().create(runner, input);
      console.info(
        'Primeiro ADM criado e ativo. Nenhuma conta anterior foi alterada.',
      );
    } finally {
      await runner.release();
    }
  } finally {
    if (database.isInitialized) await database.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof CreateFirstAdminError ||
      error instanceof PasswordPolicyError ||
      error instanceof AdminInputError
      ? error.message
      : 'Criação cancelada ou não concluída. Confira a entrada e a configuração local; nenhum detalhe interno foi exibido.',
  );
  process.exitCode = 1;
});
