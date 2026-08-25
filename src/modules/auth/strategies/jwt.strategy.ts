import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { RefreshToken } from '../entities/refresh-token.model';
import { User } from '../entities/user.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(RefreshToken) private refreshTokenModel: typeof RefreshToken,
    @InjectModel(User) private userModel: typeof User,
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

    const user = await this.userModel.findByPk(payload.sub, {
      attributes: [
        'id',
        'plan',
        'planStatus',
        'planStartedAt',
        'planExpiresAt',
        'isTrial',
        'role',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return {
      sub: payload.sub,
      id: payload.sub,
      org_id: payload.org_id,
      role: user.role,
      branch_ids: payload.branch_ids,
      session_id: payload.session_id,
      plan: user.plan,
      planStatus: user.planStatus,
      planStartedAt: user.planStartedAt,
      planExpiresAt: user.planExpiresAt,
      isTrial: user.isTrial,
    };
  }
}
