import { RateLimitException } from '../exceptions/rate-limit.exception.js';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

const publicErrors: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'Requisição inválida.' },
  401: { code: 'UNAUTHORIZED', message: 'Autenticação necessária.' },
  403: { code: 'FORBIDDEN', message: 'Acesso não permitido.' },
  404: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
  413: {
    code: 'PAYLOAD_TOO_LARGE',
    message: 'O corpo da requisição excede o limite permitido.',
  },
  415: {
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'O formato ou a codificação da requisição não é suportado.',
  },
  429: { code: 'TOO_MANY_REQUESTS', message: 'Tente novamente mais tarde.' },
};

function getStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  // Body-parser errors are raised before a controller is reached.
  if (
    exception instanceof Error &&
    'status' in exception &&
    typeof exception.status === 'number' &&
    Number.isInteger(exception.status) &&
    exception.status >= 400 &&
    exception.status < 500
  ) {
    return exception.status;
  }

  return 500;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (response.headersSent) {
      response.end();
      return;
    }

    const status = getStatus(exception);
    if (exception instanceof RateLimitException)
      response.setHeader(
        'Retry-After',
        Math.max(1, Math.ceil(exception.retryAfterSeconds)),
      );

    if (status >= 500) {
      this.logger.error('Falha interna ao processar uma requisição da API.');
    }

    const error =
      status >= 500
        ? {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Não foi possível concluir a requisição.',
          }
        : (publicErrors[status] ?? {
            code: 'BAD_REQUEST',
            message: 'Requisição inválida.',
          });

    response.status(status).json({ error });
  }
}
