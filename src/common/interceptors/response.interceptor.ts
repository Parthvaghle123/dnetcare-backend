import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped in success, return as is
        if (data && data.success !== undefined) {
          return data;
        }

        // Otherwise wrap it
        return {
          success: true,
          message: data?.message || 'Success',
          data:
            data?.data !== undefined
              ? data.data
              : data?.message && Object.keys(data).length === 1
                ? null
                : data,
          ...(data?.meta && { meta: data.meta }),
        };
      }),
    );
  }
}
