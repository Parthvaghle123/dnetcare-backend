import { Injectable, HttpException, ExecutionContext } from '@nestjs/common';
import { StatusCode } from '../enums/status-code.enum';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const parentCanActivate = await super.canActivate(context);
    if (!parentCanActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.path;
    const method = request.method;

    if (user) {
      // Clean path to remove leading/trailing slashes and global prefix
      const cleanPath = path.replace(/^\/api\/v1/, '').replace(/\/$/, '');

      if (user.role && user.role.toUpperCase() === 'MAIN_ADMIN') {
        return true;
      } else {
        // Non-MAIN_ADMIN users are BLOCKED from accessing admin-only routes:
        const isAdminOnlyRoute = 
          cleanPath.startsWith('/admin/users') ||
          cleanPath.startsWith('/admin/plans') ||
          cleanPath.startsWith('/admin/dashboard') ||
          cleanPath.startsWith('/admin/dashboard-stats');

        if (isAdminOnlyRoute) {
          throw new HttpException(
            'Access denied. You do not have permission to access the Admin Panel.',
            StatusCode.FORBIDDEN,
          );
        }
      }
    }

    return true;
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw (
        err ||
        new HttpException(
          'Unauthorized access. Please login.',
          StatusCode.UNAUTHORIZED,
        )
      );
    }
    return user;
  }
}

