import { Injectable } from '@nestjs/common';
import { RateLimitException } from '../../../common/exceptions/rate-limit.exception.js';

@Injectable()
export class PasswordCapacityService {
  private active = 0;
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= 2) throw new RateLimitException(1);
    this.active++;
    try {
      return await operation();
    } finally {
      this.active--;
    }
  }
}
