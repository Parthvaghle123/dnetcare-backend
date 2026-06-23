import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PrescriptionController } from './prescription.controller';
import { PrescriptionService } from './prescription.service';
import { Prescription } from './entities/prescription.model';
import { PrescriptionMedicine } from './entities/prescription-medicine.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { Patient } from '../patient/entities/patient.model';
import { User } from '../auth/entities/user.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { Branch } from '../organization/entities/branch.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Prescription,
      PrescriptionMedicine,
      Consultation,
      Patient,
      User,
      DoctorProfile,
      Branch,
    ]),
  ],
  controllers: [PrescriptionController],
  providers: [PrescriptionService],
  exports: [SequelizeModule, PrescriptionService],
})
export class PrescriptionModule {}
