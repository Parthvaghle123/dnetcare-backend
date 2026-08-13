import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';
    let error: string = ErrorCode.INTERNAL_ERROR;

    const getErrorCode = (status: number): string => {
      switch (status) {
        case 400:
          return ErrorCode.BAD_REQUEST;
        case 401:
          return ErrorCode.UNAUTHORIZED;
        case 403:
          return ErrorCode.FORBIDDEN;
        case 404:
          return ErrorCode.NOT_FOUND;
        case 409:
          return ErrorCode.CONFLICT;
        case 413:
          return ErrorCode.PAYLOAD_TOO_LARGE;
        case 422:
          return ErrorCode.UNPROCESSABLE_ENTITY;
        case 429:
          return ErrorCode.TOO_MANY_REQUESTS;
        default:
          return ErrorCode.INTERNAL_ERROR;
      }
    };

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse() as any;

      error = getErrorCode(statusCode);

      // Handle standard NestJS validation errors (e.g. from class-validator)
      if (res && res.message && Array.isArray(res.message)) {
        message = res.message[0]; // Take first validation error
        error = ErrorCode.VALIDATION_ERROR;
      }
      // Handle our custom error format or standard string format
      else if (res && typeof res === 'object') {
        message = res.message || message;
        if (
          res.error &&
          typeof res.error === 'string' &&
          res.error !== 'Bad Request' &&
          res.error !== 'Not Found' &&
          res.error !== 'Payload Too Large'
        ) {
          // Only override if they provided a custom error code string, avoid Nest's default 'Bad Request' overwriting it
          error = res.error.toUpperCase().replace(/\s+/g, '_');
        }
        
        if (statusCode === 413 && message === 'File too large') {
          message = 'File size must be less than 5 MB';
        }
      } else if (typeof res === 'string') {
        message = res;
      }
    } else {
      // Log unexpected errors
      console.error('Unhandled Exception:', exception);
    }

    response.status(statusCode).json({
      success: false,
      message,
      error,
      statusCode,
    });
  }
}
