import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';

import { Consultation } from './entities/consultation.model';
import { DentalChartEntry } from './entities/dental-chart-entry.model';
import { ConsultationDocument } from './entities/consultation-document.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { Appointment } from '../appointment/entities/appointment.model';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Consultation,
      DentalChartEntry,
      ConsultationDocument,
      Patient,
      Branch,
      User,
      Appointment,
    ]),
    UploadModule,
  ],
  controllers: [ConsultationController],
  providers: [ConsultationService],
  exports: [SequelizeModule, ConsultationService],
})
export class ConsultationModule {}
