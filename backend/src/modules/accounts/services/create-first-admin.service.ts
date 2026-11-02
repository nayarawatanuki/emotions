import { createHash } from 'node:crypto';
import type { QueryRunner } from 'typeorm';
import { PasswordService } from '../../auth/services/password.service.js';
import { AccountEntity } from '../entities/account.entity.js';

export interface CreateFirstAdminInput {
  name: string;
  username: string;
  password: string;
}

export class CreateFirstAdminError extends Error {}

export function firstAdminCreationLockName(database: string): string {
  return `emotions:create-first-admin:${createHash('sha256').update(database).digest('hex').slice(0, 32)}`;
}

function normalizeLabel(value: string): string {
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > 510 ||
    Array.from(normalized).length > 255 ||
    /[\p{Cc}\p{Cs}]/u.test(normalized)
  ) {
    throw new CreateFirstAdminError(
      'Nome e usuário devem ter entre 1 e 255 caracteres válidos, sem controles.',
    );
  }
  return normalized;
}

export class CreateFirstAdminService {
  constructor(private readonly passwords = new PasswordService()) {}

  // The caller owns this connected runner and must release it, including on failure.
  async create(
    queryRunner: QueryRunner,
    input: CreateFirstAdminInput,
  ): Promise<void> {
    const name = normalizeLabel(input.name);
    const username = normalizeLabel(input.username.toLowerCase());
    const passwordHash = await this.passwords.hash(input.password);
    const database = queryRunner.connection.options.database;
    if (typeof database !== 'string')
      throw new CreateFirstAdminError('Banco não configurado.');
    const lockName = firstAdminCreationLockName(database);
    const result: unknown = await queryRunner.query(
      'SELECT GET_LOCK(?, 0) AS acquired',
      [lockName],
    );
    const row: unknown = Array.isArray(result) ? result[0] : undefined;
    if (
      !row ||
      typeof row !== 'object' ||
      !('acquired' in row) ||
      (row.acquired !== 1 && row.acquired !== '1')
    ) {
      throw new CreateFirstAdminError(
        'Já existe uma criação de ADM em andamento. Tente novamente depois.',
      );
    }
    let transactionStarted = false;
    try {
      await queryRunner.startTransaction();
      transactionStarted = true;
      const accounts = queryRunner.manager.getRepository(AccountEntity);
      if (await accounts.existsBy({ role: 'administrator' })) {
        throw new CreateFirstAdminError(
          'Já existe um ADM. Este comando não altera nem recupera contas.',
        );
      }
      if (await accounts.existsBy({ username })) {
        throw new CreateFirstAdminError('Este usuário já está cadastrado.');
      }
      await accounts.insert({
        name,
        username,
        passwordHash,
        role: 'administrator',
        status: 'active',
        lastSignedInAt: null,
      });
      await queryRunner.commitTransaction();
      transactionStarted = false;
    } finally {
      try {
        if (transactionStarted) await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.query('SELECT RELEASE_LOCK(?)', [lockName]);
      }
    }
  }
}
