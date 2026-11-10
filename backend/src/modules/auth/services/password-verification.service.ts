import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PasswordCapacityService } from './password-capacity.service.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class PasswordVerificationService implements OnModuleInit {
  private dummyHash: string | null = null;
  constructor(
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(PasswordCapacityService)
    private readonly capacity: PasswordCapacityService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.passwords.hash(
      randomBytes(32).toString('base64url'),
    );
  }

  async verify(password: string, stored: string | null): Promise<boolean> {
    const dummyHash = this.dummyHash;
    if (!dummyHash) throw new Error('Verificação de senhas não inicializada.');
    return this.capacity.run(async () => {
      const supported =
        stored !== null && this.passwords.isSupportedHash(stored);
      const matches = await this.passwords.verify(
        password,
        supported ? stored : dummyHash,
      );
      return supported && matches;
    });
  }
}
