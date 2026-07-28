import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PatientController } from './patient.controller';
import { MedicalConditionController } from './medical-condition.controller';
import { PatientService } from './patient.service';
import { Patient } from './entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { MedicalConditionMaster } from './entities/medical-condition-master.model';
import { PatientMedicalCondition } from './entities/patient-medical-condition.model';
import { BillingModule } from '../billing/billing.module';
import { Consultation } from '../consultation/entities/consultation.model';
import { DentalChartEntry } from '../consultation/entities/dental-chart-entry.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Patient,
      Branch,
      User,
      MedicalConditionMaster,
      PatientMedicalCondition,
      Consultation,
      DentalChartEntry,
    ]),
    BillingModule,
  ],
  controllers: [PatientController, MedicalConditionController],
  providers: [PatientService],
  exports: [SequelizeModule, PatientService],
})
export class PatientModule {}
