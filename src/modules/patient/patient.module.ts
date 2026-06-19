import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { Patient } from './entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';

@Module({
  imports: [SequelizeModule.forFeature([Patient, Branch, User])],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [SequelizeModule, PatientService],
})
export class PatientModule {}
