import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { AUTH_ENVIRONMENT } from '../../../config/auth-environment.js';
import type { AuthEnvironment } from '../../../config/auth-environment.js';
import { RateLimitException } from '../../../common/exceptions/rate-limit.exception.js';
import { AuthRateLimitEntity } from '../entities/auth-rate-limit.entity.js';
import { keyedDigest } from '../security/session-tokens.js';
import { databaseNow } from './auth-time.js';

const windowMilliseconds = 15 * 60_000;

@Injectable()
export class AuthRateLimitService {
  constructor(
    @Inject(DataSource) private readonly source: DataSource,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
  ) {}

  async consume(address: string | undefined, username: string): Promise<void> {
    if (!address || isIP(address) === 0) throw new BadRequestException();
    const origin =
      address.startsWith('::ffff:') && isIP(address.slice(7)) === 4
        ? address.slice(7)
        : address;
    const keys = [
      {
        scope: 'login_origin' as const,
        key: keyedDigest(this.environment.secret, 'login-origin-v1', [origin]),
        maximum: 30,
      },
      {
        scope: 'login_origin_account' as const,
        key: keyedDigest(this.environment.secret, 'login-origin-account-v1', [
          origin,
          username,
        ]),
        maximum: 5,
      },
    ];
    // Stable scope order prevents concurrent requests from locking counters in reverse order.
    const retryAfter = await this.source.transaction(async (manager) => {
      const now = await databaseNow(manager);
      const expiresAt = new Date(now.getTime() + windowMilliseconds);
      for (const key of keys) {
        await manager.query(
          'INSERT INTO auth_rate_limits (id, scope, key_digest, window_started_at, window_expires_at, attempt_count) VALUES (?, ?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE id = id',
          [randomUUID(), key.scope, key.key, now, expiresAt],
        );
        const limits = manager.getRepository(AuthRateLimitEntity);
        const counter = await limits.findOneOrFail({
          where: { scope: key.scope, keyDigest: key.key },
          lock: { mode: 'pessimistic_write' },
        });
        if (counter.windowExpiresAt <= now) {
          await limits.update(counter.id, {
            windowStartedAt: now,
            windowExpiresAt: expiresAt,
            attemptCount: 1,
            blockedUntil: null,
          });
        } else if (
          counter.attemptCount >= key.maximum ||
          (counter.blockedUntil !== null && counter.blockedUntil > now)
        ) {
          await limits.update(counter.id, {
            blockedUntil: counter.windowExpiresAt,
          });
          return Math.max(
            1,
            Math.ceil(
              (counter.windowExpiresAt.getTime() - now.getTime()) / 1000,
            ),
          );
        } else {
          await limits.update(counter.id, {
            attemptCount: counter.attemptCount + 1,
          });
        }
      }
      return 0;
    });
    // Throw after commit so a rejected request cannot roll back the shared limit state.
    if (retryAfter > 0) throw new RateLimitException(retryAfter);
  }
}
