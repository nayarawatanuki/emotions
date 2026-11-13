import { Test } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';

@Controller('test-failure')
class FailureController {
  @Get()
  fail(): never {
    throw new Error(
      'Private database credentials must never appear in the response.',
    );
  }
}

describe('Emotions API (e2e)', () => {
  let app: NestExpressApplication<Server>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule.register({ DB_ENABLED: 'false' })],
      controllers: [FailureController],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication<Server>>({
      bodyParser: false,
    });
    app.useLogger(false);
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns only a liveness status', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect({ status: 'ok' });
  });

  it('adds API security headers and removes framework disclosure', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers.etag).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it.each([
    '/',
    '/missing?token=private',
    '/test-failure/not-real',
    '/children',
    '/children/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ])('returns a safe 404 for %s', async (path) => {
    await request(app.getHttpServer())
      .get(path)
      .expect(404)
      .expect({
        error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
      });
  });

  it('does not treat unsupported methods as successful health checks', async () => {
    await request(app.getHttpServer()).post('/health').expect(404);
  });

  it('rejects malformed JSON without returning its contents', async () => {
    await request(app.getHttpServer())
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{"private":')
      .expect(400)
      .expect({
        error: { code: 'BAD_REQUEST', message: 'Requisição inválida.' },
      });
  });

  it('enforces the 16kb JSON limit', async () => {
    await request(app.getHttpServer())
      .post('/health')
      .send({ data: 'x'.repeat(17 * 1024) })
      .expect(413)
      .expect({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'O corpo da requisição excede o limite permitido.',
        },
      });
  });

  it('rejects compressed bodies', async () => {
    await request(app.getHttpServer())
      .post('/health')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .send('{}')
      .expect(415)
      .expect({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'O formato ou a codificação da requisição não é suportado.',
        },
      });
  });

  it('never exposes internal exception details', async () => {
    await request(app.getHttpServer())
      .get('/test-failure')
      .expect(500)
      .expect({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Não foi possível concluir a requisição.',
        },
      });
  });
});
