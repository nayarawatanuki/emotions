import type { NestExpressApplication } from '@nestjs/platform-express';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { securityHeaders } from '../common/middlewares/security-headers.middleware.js';

export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  app.disable('etag');
  app.set('trust proxy', false);
  app.use(securityHeaders);
  app.useBodyParser('json', { limit: '16kb', strict: true, inflate: false });
  app.useGlobalFilters(new HttpExceptionFilter());
}
