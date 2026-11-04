import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(argon2);
const prefix = '$argon2id$v=19$m=65536,t=3,p=1$';
const parameters = { memory: 65536, passes: 3, parallelism: 1, tagLength: 32 };

export class PasswordPolicyError extends Error {
  constructor() {
    super(
      'A senha deve ter entre 15 e 128 caracteres Unicode válidos, até 512 bytes.',
    );
  }
}

export class PasswordService {
  validate(password: string): void {
    if (
      password.length > 256 ||
      /[\uD800-\uDFFF]/u.test(password) ||
      Array.from(password).length < 15 ||
      Array.from(password).length > 128 ||
      Buffer.byteLength(password, 'utf8') > 512
    ) {
      throw new PasswordPolicyError();
    }
  }

  async hash(password: string): Promise<string> {
    this.validate(password);
    const salt = randomBytes(16);
    const key = await this.derive(password, salt);
    try {
      return `${prefix}${salt.toString('base64').replace(/=+$/, '')}$${key.toString('base64').replace(/=+$/, '')}`;
    } finally {
      key.fill(0);
    }
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    try {
      this.validate(password);
    } catch {
      return false;
    }
    const parsed = this.parseHash(encoded);
    if (!parsed) return false;
    const { salt, expected } = parsed;
    const actual = await this.derive(password, salt);
    try {
      return timingSafeEqual(actual, expected);
    } finally {
      actual.fill(0);
      expected.fill(0);
    }
  }

  isSupportedHash(encoded: string): boolean {
    return this.parseHash(encoded) !== null;
  }

  private parseHash(
    encoded: string,
  ): { salt: Buffer; expected: Buffer } | null {
    // Only this bounded cost profile is accepted; stored input cannot raise KDF cost.
    if (!encoded.startsWith(prefix) || encoded.length !== prefix.length + 66)
      return null;
    const fields = encoded.slice(prefix.length).split('$');
    const saltText = fields[0];
    const keyText = fields[1];
    if (!saltText || !keyText || fields.length !== 2) return null;
    const salt = Buffer.from(saltText, 'base64');
    const expected = Buffer.from(keyText, 'base64');
    if (
      salt.length !== 16 ||
      expected.length !== 32 ||
      salt.toString('base64').replace(/=+$/, '') !== saltText ||
      expected.toString('base64').replace(/=+$/, '') !== keyText
    )
      return null;
    return { salt, expected };
  }

  private async derive(password: string, salt: Buffer): Promise<Buffer> {
    const message = Buffer.from(password, 'utf8');
    try {
      return await deriveKey('argon2id', {
        ...parameters,
        message,
        nonce: salt,
      });
    } finally {
      message.fill(0);
    }
  }
}
