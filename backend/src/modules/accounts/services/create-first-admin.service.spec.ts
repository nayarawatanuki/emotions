import type { QueryRunner } from 'typeorm';
import { PasswordService } from '../../auth/services/password.service.js';
import {
  CreateFirstAdminService,
  firstAdminCreationLockName,
} from './create-first-admin.service.js';

describe('CreateFirstAdminService', () => {
  const input = {
    name: ' Synthetic Admin ',
    username: ' ADMIN ',
    password: 'synthetic phrase for tests',
  };
  function fixture(acquired: unknown = '1') {
    const accounts = {
      existsBy: vi.fn().mockResolvedValue(false),
      insert: vi.fn().mockResolvedValue({}),
    };
    const runner = {
      connection: { options: { database: 'emotions_development' } },
      manager: { getRepository: vi.fn().mockReturnValue(accounts) },
      query: vi.fn().mockResolvedValue([{ acquired }]),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    };
    const passwords = new PasswordService();
    const hash = vi
      .spyOn(passwords, 'hash')
      .mockResolvedValue('synthetic-hash');
    const service = new CreateFirstAdminService(passwords);
    return {
      accounts,
      runner,
      hash,
      create: (value = input) =>
        service.create(runner as unknown as QueryRunner, value),
    };
  }

  it('normalizes identity and creates exactly one active administrator inside the lock and transaction', async () => {
    const f = fixture();
    await f.create();
    expect(f.accounts.existsBy).toHaveBeenNthCalledWith(1, {
      role: 'administrator',
    });
    expect(f.accounts.insert).toHaveBeenCalledWith({
      name: 'Synthetic Admin',
      username: 'admin',
      passwordHash: 'synthetic-hash',
      role: 'administrator',
      status: 'active',
      lastSignedInAt: null,
    });
    expect(f.runner.startTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      f.accounts.existsBy.mock.invocationCallOrder[0]!,
    );
    expect(f.runner.commitTransaction).toHaveBeenCalledOnce();
    expect(f.runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(f.runner.query).toHaveBeenLastCalledWith('SELECT RELEASE_LOCK(?)', [
      firstAdminCreationLockName('emotions_development'),
    ]);
    expect(f.runner.commitTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      f.runner.query.mock.invocationCallOrder[1]!,
    );
  });

  it('refuses any existing administrator regardless of status and rolls back', async () => {
    const f = fixture();
    f.accounts.existsBy.mockResolvedValueOnce(true);
    await expect(f.create()).rejects.toThrow('Já existe um ADM');
    expect(f.accounts.existsBy).toHaveBeenCalledExactlyOnceWith({
      role: 'administrator',
    });
    expect(f.accounts.insert).not.toHaveBeenCalled();
    expect(f.runner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(f.runner.query).toHaveBeenCalledTimes(2);
  });

  it('refuses an occupied username without replacing it', async () => {
    const f = fixture();
    f.accounts.existsBy
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    await expect(f.create()).rejects.toThrow('usuário já');
    expect(f.accounts.insert).not.toHaveBeenCalled();
    expect(f.runner.rollbackTransaction).toHaveBeenCalledOnce();
  });

  it.each([0, '0', null, undefined, 'unexpected'])(
    'fails closed when the lock cannot be acquired',
    async (acquired) => {
      const f = fixture(acquired);
      if (acquired === undefined) f.runner.query.mockResolvedValue([]);
      await expect(f.create()).rejects.toThrow('em andamento');
      expect(f.runner.startTransaction).not.toHaveBeenCalled();
      expect(f.accounts.insert).not.toHaveBeenCalled();
    },
  );

  it('rolls back a failed insert and always releases the lock', async () => {
    const f = fixture();
    f.accounts.insert.mockRejectedValue(new Error('synthetic failure'));
    await expect(f.create()).rejects.toThrow('synthetic failure');
    expect(f.runner.commitTransaction).not.toHaveBeenCalled();
    expect(f.runner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(f.runner.query).toHaveBeenCalledTimes(2);
  });

  it('releases the lock even when starting a transaction fails', async () => {
    const f = fixture();
    f.runner.startTransaction.mockRejectedValue(new Error('unavailable'));
    await expect(f.create()).rejects.toThrow('unavailable');
    expect(f.runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(f.runner.query).toHaveBeenCalledTimes(2);
  });

  it.each(['', 'a'.repeat(256), 'invalid\nname', 'invalid\ud800'])(
    'rejects invalid identities before hashing or accessing persistence',
    async (name) => {
      const f = fixture();
      await expect(f.create({ ...input, name })).rejects.toThrow(
        'Nome e usuário',
      );
      expect(f.hash).not.toHaveBeenCalled();
      expect(f.runner.query).not.toHaveBeenCalled();
    },
  );

  it('scopes a bounded lock name to the database', () => {
    expect(firstAdminCreationLockName('a')).not.toBe(
      firstAdminCreationLockName('b'),
    );
    expect(
      firstAdminCreationLockName('x'.repeat(64)).length,
    ).toBeLessThanOrEqual(64);
  });
});
