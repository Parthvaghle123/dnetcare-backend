import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

import { User } from './entities/user.model';
import { UserBranch } from './entities/user-branch.model';
import { RefreshToken } from './entities/refresh-token.model';
import { Organization } from '../organization/entities/organization.model';
import { Branch } from '../organization/entities/branch.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { NotificationModule } from '../notification/notification.module';
import { MedicalConditionMaster } from '../patient/entities/medical-condition-master.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      Organization,
      Branch,
      UserBranch,
      RefreshToken,
      DoctorProfile,
      MedicalConditionMaster,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET') as string,
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN') as any,
        },
      }),
    }),
    NotificationModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, JwtStrategy, PassportModule, AuthService],
})
export class AuthModule {}
