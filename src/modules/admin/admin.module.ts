import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.model';
import { Organization } from '../organization/entities/organization.model';
import { Branch } from '../organization/entities/branch.model';
import { Appointment } from '../appointment/entities/appointment.model';
import { Patient } from '../patient/entities/patient.model';
import { Plan } from '../subscription/entities/plan.model';
import { Invoice } from '../billing/entities/invoice.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { TreatmentPlan } from '../treatment/entities/treatment-plan.model';
import { Payment } from '../billing/entities/payment.model';
import { Expense } from '../finance/entities/expense.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { RefreshToken } from '../auth/entities/refresh-token.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      Organization,
      Branch,
      Appointment,
      Patient,
      Plan,
      Invoice,
      Consultation,
      TreatmentPlan,
      Payment,
      Expense,
      UserBranch,
      RefreshToken,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
