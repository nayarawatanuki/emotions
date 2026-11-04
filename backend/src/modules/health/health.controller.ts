import { PublicRoute } from '../auth/decorators/access.decorator.js';
import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
}

@Controller('health')
export class HealthController {
  @PublicRoute()
  @Get()
  getHealth(): HealthResponse {
    return { status: 'ok' };
  }
}
