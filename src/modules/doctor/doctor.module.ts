import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { DoctorProfile } from './entities/doctor-profile.model';
import { DoctorSchedule } from './entities/doctor-schedule.model';
import { DoctorLeave } from './entities/doctor-leave.model';
import { User } from '../auth/entities/user.model';
import { UserBranch } from '../auth/entities/user-branch.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      DoctorProfile,
      DoctorSchedule,
      DoctorLeave,
      User,
      UserBranch,
    ]),
  ],
  controllers: [DoctorController],
  providers: [DoctorService],
  exports: [DoctorService],
})
export class DoctorModule {}
