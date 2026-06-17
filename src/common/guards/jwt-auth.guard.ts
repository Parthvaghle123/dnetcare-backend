import { Injectable, HttpException } from '@nestjs/common';
import { StatusCode } from '../enums/status-code.enum';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new HttpException('Unauthorized access. Please login.', StatusCode.UNAUTHORIZED);
    }
    return user;
  }
}
