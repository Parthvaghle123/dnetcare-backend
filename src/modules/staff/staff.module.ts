import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { User } from '../auth/entities/user.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { RefreshToken } from '../auth/entities/refresh-token.model';

@Module({
  imports: [
    SequelizeModule.forFeature([User, UserBranch, RefreshToken])
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
