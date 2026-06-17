import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { RefreshToken } from '../entities/refresh-token.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(RefreshToken) private refreshTokenModel: typeof RefreshToken,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') as string,
    });
  }

  async validate(payload: any) {
    if (!payload.session_id) {
      throw new UnauthorizedException('Invalid token structure.');
    }

    const session = await this.refreshTokenModel.findByPk(payload.session_id);
    if (!session || session.is_revoked || new Date() > session.expires_at) {
      throw new UnauthorizedException('Session has been revoked or expired.');
    }

    return {
      sub: payload.sub,
      org_id: payload.org_id,
      role: payload.role,
      branch_ids: payload.branch_ids,
      session_id: payload.session_id,
    };
  }
}
