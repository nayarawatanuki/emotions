import { PasswordService } from './password.service.js';
import { PasswordVerificationService } from './password-verification.service.js';
describe('bounded password verification', () => {
  it('does comparable dummy work for missing and unsupported hashes', async () => {
    const passwords = new PasswordService();
    vi.spyOn(passwords, 'hash').mockResolvedValue('dummy-hash');
    vi.spyOn(passwords, 'isSupportedHash').mockReturnValue(false);
    const verify = vi.spyOn(passwords, 'verify').mockResolvedValue(true);
    const service = new PasswordVerificationService(passwords);
    await service.onModuleInit();
    expect(await service.verify('a synthetic password', null)).toBe(false);
    expect(await service.verify('a synthetic password', 'corrupt')).toBe(false);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(verify).toHaveBeenLastCalledWith(
      'a synthetic password',
      'dummy-hash',
    );
  });
  it('rejects a third concurrent KDF without a queue and releases slots after errors', async () => {
    const passwords = new PasswordService();
    vi.spyOn(passwords, 'hash').mockResolvedValue('dummy');
    vi.spyOn(passwords, 'isSupportedHash').mockReturnValue(true);
    let release: (value: boolean) => void = () => {
      throw new Error('Missing waiter');
    };
    const pending = new Promise<boolean>((resolve) => {
      release = resolve;
    });
    const verify = vi.spyOn(passwords, 'verify').mockReturnValue(pending);
    const service = new PasswordVerificationService(passwords);
    await service.onModuleInit();
    const first = service.verify('synthetic phrase', 'stored');
    const second = service.verify('synthetic phrase', 'stored');
    await expect(
      service.verify('synthetic phrase', 'stored'),
    ).rejects.toMatchObject({ retryAfterSeconds: 1 });
    expect(verify).toHaveBeenCalledTimes(2);
    release(true);
    await Promise.all([first, second]);
    verify.mockRejectedValueOnce(new Error('synthetic KDF failure'));
    await expect(service.verify('synthetic phrase', 'stored')).rejects.toThrow(
      'KDF failure',
    );
    verify.mockResolvedValue(true);
    expect(await service.verify('synthetic phrase', 'stored')).toBe(true);
  });
});
