import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RateLimitException } from '../../../common/exceptions/rate-limit.exception.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class PasswordVerificationService implements OnModuleInit {
  private dummyHash: string | null = null;
  private active = 0;
  constructor(
    @Inject(PasswordService) private readonly passwords: PasswordService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.passwords.hash(
      randomBytes(32).toString('base64url'),
    );
  }

  async verify(password: string, stored: string | null): Promise<boolean> {
    if (!this.dummyHash)
      throw new Error('Verificação de senhas não inicializada.');
    if (this.active >= 2) throw new RateLimitException(1);
    this.active++;
    try {
      const supported =
        stored !== null && this.passwords.isSupportedHash(stored);
      const matches = await this.passwords.verify(
        password,
        supported ? stored : this.dummyHash,
      );
      return supported && matches;
    } finally {
      this.active--;
    }
  }
}
