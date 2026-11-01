import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './config/configure-app.js';
import { readEnvironment } from './config/environment.js';

async function bootstrap() {
  const environment = readEnvironment(process.env);
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(process.env),
    {
      bodyParser: false,
      abortOnError: false,
    },
  );

  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(environment.port, environment.host);
}

try {
  await bootstrap();
} catch {
  Logger.error(
    'Não foi possível iniciar a API. Verifique as configurações, a porta e a conexão com o banco, se habilitada.',
    'Bootstrap',
  );
  process.exitCode = 1;
}
