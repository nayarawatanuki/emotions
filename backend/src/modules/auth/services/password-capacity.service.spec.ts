import { PasswordCapacityService } from './password-capacity.service.js';
import { PasswordService } from './password.service.js';
import { PasswordVerificationService } from './password-verification.service.js';
describe('password capacity shared by login and activation', () => {
  it('uses one budget for verification and hashing and recovers after completion', async () => {
    const capacity = new PasswordCapacityService();
    const passwords = new PasswordService();
    vi.spyOn(passwords, 'hash').mockResolvedValue('synthetic-dummy');
    vi.spyOn(passwords, 'isSupportedHash').mockReturnValue(true);
    let release: (value: boolean) => void = () => {
      throw new Error('Missing waiter');
    };
    const pending = new Promise<boolean>((resolve) => {
      release = resolve;
    });
    vi.spyOn(passwords, 'verify').mockReturnValue(pending);
    const verification = new PasswordVerificationService(passwords, capacity);
    await verification.onModuleInit();
    const login = verification.verify('synthetic password', 'synthetic hash');
    const hashing = capacity.run(() => pending);
    await expect(
      capacity.run(async () => 'another activation'),
    ).rejects.toMatchObject({ retryAfterSeconds: 1 });
    release(true);
    await Promise.all([login, hashing]);
    await expect(capacity.run(async () => 'free slot')).resolves.toBe(
      'free slot',
    );
  });
});
