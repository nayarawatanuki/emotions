import { HttpException, HttpStatus } from '@nestjs/common';

export class RateLimitException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super('Tente novamente mais tarde.', HttpStatus.TOO_MANY_REQUESTS);
  }
}
