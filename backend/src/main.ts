import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './config/configure-app.js';
import { readEnvironment } from './config/environment.js';

async function bootstrap() {
  const environment = readEnvironment(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(environment.port, environment.host);
}

try {
  await bootstrap();
} catch {
  Logger.error(
    'Não foi possível iniciar a API. Verifique as configurações e a disponibilidade da porta.',
    'Bootstrap',
  );
  process.exitCode = 1;
}
