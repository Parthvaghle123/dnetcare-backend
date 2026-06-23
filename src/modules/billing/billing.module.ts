import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Invoice } from './entities/invoice.model';
import { InvoiceLineItem } from './entities/invoice-line-item.model';
import { Payment } from './entities/payment.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { ProcedureCatalog } from '../catalog/entities/procedure-catalog.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { TreatmentPlan } from '../treatment/entities/treatment-plan.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Invoice,
      InvoiceLineItem,
      Payment,
      Patient,
      Branch,
      User,
      ProcedureCatalog,
      Consultation,
      TreatmentPlan,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [SequelizeModule, BillingService],
})
export class BillingModule {}
