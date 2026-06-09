import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // getResponse() có thể trả về string hoặc object {message, error, statusCode}
    // → flatten về string để client không phải xử lý object lồng nhau
    let message: string | string[];
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        // NestJS class-validator trả message là string[] hoặc string
        const inner = r['message'];
        if (Array.isArray(inner)) {
          message = inner as string[];
        } else if (typeof inner === 'string') {
          message = inner;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
    } else {
      message = 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
