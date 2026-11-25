import {
  ArgumentsHost,
  CanActivate,
  Catch,
  createParamDecorator,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '../../application/auth.service';
import type { Session } from '../../application/ports';
import { DomainError } from '../../domain/errors/DomainError';
import { RequestValidation } from './validation';
import { authorizationFor } from './browser-session';

type AuthRequest = Request & { accountSession?: Session };
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    req.accountSession = await this.auth.identify(authorizationFor(req));
    return true;
  }
}
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Session => {
    const session = context
      .switchToHttp()
      .getRequest<AuthRequest>().accountSession;
    if (!session) throw new DomainError('Sign in is required', 401);
    return session;
  },
);

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;
    if (error instanceof DomainError) {
      response.status(error.status).json({
        statusCode: error.status,
        code: error.code ?? error.name,
        message: error.message,
        ...(error instanceof RequestValidation
          ? { details: error.details }
          : {}),
      });
      return;
    }
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json({
        statusCode: error.getStatus(),
        code: 'HTTP_ERROR',
        message: error.message,
      });
      return;
    }
    const db = error as {
      code?: string;
      status?: number;
      name?: string;
    } | null;
    if (db?.code === '23505') {
      response.status(409).json({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'A record already uses that value',
      });
      return;
    }
    if (db?.status === 400 || db?.status === 413) {
      response.status(db.status).json({
        statusCode: db.status,
        code: 'INVALID_BODY',
        message: 'Request body is invalid or exceeds the size limit',
      });
      return;
    }
    this.logger.error({
      event: 'request-failed',
      kind: db?.name ?? 'unknown',
      dbCode: db?.code,
    });
    response.status(500).json({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }
}
