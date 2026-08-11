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

      // Check if the user's trial is expired
      const isExpired = user.planStatus === 'EXPIRED' || !!(
        user.plan === 'ULTRA_PRO' &&
        user.isTrial &&
        user.planExpiresAt &&
        (!isNaN(new Date(user.planExpiresAt).getTime())) &&
        new Date() > new Date(user.planExpiresAt)
      );

      if (isExpired) {
        // Expired trial users are in read-only mode: ALLOW GET, but BLOCK POST, PUT, PATCH, DELETE
        const isGet = method === 'GET';
        const isAllowedPostRoute = 
          cleanPath === '/auth/logout' ||
          cleanPath === '/subscription/checkout' ||
          cleanPath === '/subscription/verify';

        if (!isGet && !isAllowedPostRoute) {
          throw new HttpException(
            {
              success: false,
              message: 'Your trial plan has expired. Please upgrade your plan to modify data.',
            },
            StatusCode.FORBIDDEN,
          );
        }
      }

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

