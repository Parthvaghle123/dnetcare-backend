import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';
    let error = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse() as any;
      
      // Handle standard NestJS validation errors (e.g. from class-validator)
      if (res && res.message && Array.isArray(res.message)) {
        message = res.message[0]; // Take first validation error
        error = 'VALIDATION_ERROR';
      } 
      // Handle our custom error format or standard string format
      else if (res && typeof res === 'object') {
        message = res.message || message;
        error = res.error || res.error || (statusCode === 400 ? 'BAD_REQUEST' : 'HTTP_ERROR');
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
    });
  }
}
