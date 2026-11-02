import { PasswordPolicyError, PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();
  const password = 'Uma frase longa 🎀 sem pressão';

  it('uses independent random salts and verifies only the exact password', async () => {
    const first = await service.hash(password);
    const second = await service.hash(password);
    expect(first).not.toBe(second);
    expect(first).toMatch(
      /^\$argon2id\$v=19\$m=65536,t=3,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/,
    );
    expect(await service.verify(password, first)).toBe(true);
    expect(await service.verify(`${password} `, first)).toBe(false);
    expect(await service.verify('Uma frase diferente e longa', first)).toBe(
      false,
    );
  });

  it('preserves leading/trailing spaces and does not normalize Unicode', async () => {
    const value = '  quinze caracteres é  ';
    const hash = await service.hash(value);
    expect(await service.verify(value, hash)).toBe(true);
    expect(await service.verify(value.trim(), hash)).toBe(false);
    expect(await service.verify(value.normalize('NFD'), hash)).toBe(false);
  });

  it.each([
    '',
    'a'.repeat(14),
    'a'.repeat(129),
    '\ud800' + 'a'.repeat(15),
    'a'.repeat(15) + '\udfff',
  ])('rejects invalid password policy without deriving a key', (value) => {
    expect(() => service.validate(value)).toThrow(PasswordPolicyError);
  });

  it('counts Unicode code points and allows the policy boundaries', () => {
    expect(() => service.validate('🎀'.repeat(15))).not.toThrow();
    expect(() => service.validate('🎀'.repeat(128))).not.toThrow();
    expect(() => service.validate('a'.repeat(15))).not.toThrow();
  });

  it.each([
    '',
    'plaintext',
    '$argon2id$v=19$m=999999999,t=3,p=1$bad$bad',
    '$argon2id$v=19$m=65536,t=3,p=1$' +
      'A'.repeat(22) +
      '$' +
      'A'.repeat(43) +
      '\n',
  ])('refuses malformed or unapproved stored hashes', async (hash) => {
    expect(await service.verify(password, hash)).toBe(false);
  });

  it('rejects a noncanonical salt and an invalid password when verifying', async () => {
    const hash = await service.hash(password);
    const saltStart = hash.lastIndexOf('$') - 22;
    const malformed =
      hash.slice(0, saltStart) + '!'.repeat(22) + hash.slice(saltStart + 22);
    expect(await service.verify(password, malformed)).toBe(false);
    expect(await service.verify('short', hash)).toBe(false);
  });
});
