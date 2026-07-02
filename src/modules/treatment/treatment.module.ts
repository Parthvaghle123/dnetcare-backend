import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TreatmentController } from './treatment.controller';
import { TreatmentService } from './treatment.service';

import { TreatmentPlan } from './entities/treatment-plan.model';
import { TreatmentPlanPhase } from './entities/treatment-plan-phase.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { ProcedureCatalog } from '../catalog/entities/procedure-catalog.model';
import { User } from '../auth/entities/user.model';
import { Invoice } from '../billing/entities/invoice.model';
import { InvoiceLineItem } from '../billing/entities/invoice-line-item.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      TreatmentPlan,
      TreatmentPlanPhase,
      Patient,
      Branch,
      Consultation,
      ProcedureCatalog,
      User,
      Invoice,
      InvoiceLineItem,
      DoctorProfile
    ])
  ],
  controllers: [TreatmentController],
  providers: [TreatmentService],
  exports: [TreatmentService]
})
export class TreatmentModule {}
