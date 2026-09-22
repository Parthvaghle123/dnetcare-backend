import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Appointment } from '../modules/appointment/entities/appointment.model';
import { AppointmentStatusHistory } from '../modules/appointment/entities/appointment-status-history.model';
import { TreatmentPlan } from '../modules/treatment/entities/treatment-plan.model';
import { TreatmentPlanPhase } from '../modules/treatment/entities/treatment-plan-phase.model';
import { Invoice } from '../modules/billing/entities/invoice.model';
import { InvoiceLineItem } from '../modules/billing/entities/invoice-line-item.model';
import { Payment } from '../modules/billing/entities/payment.model';
import { Expense } from '../modules/finance/entities/expense.model';
import { ExpenseCategory } from '../modules/finance/entities/expense-category.model';
import { Prescription } from '../modules/prescription/entities/prescription.model';
import { PrescriptionMedicine } from '../modules/prescription/entities/prescription-medicine.model';
import { MedicineMaster } from '../modules/prescription/entities/medicine-master.model';
import { InternshipInquiry } from '../modules/internship/entities/internship-inquiry.model';
import { Plan } from '../modules/subscription/entities/plan.model';
import { Subscription } from '../modules/subscription/entities/subscription.model';
import { SubscriptionPayment } from '../modules/subscription/entities/subscription-payment.model';
import { WebsiteConfig } from '../modules/website/entities/website-config.model';
import { SupportTicket } from '../modules/support/entities/support.model';
import { PatientBranch } from '../modules/patient/entities/patient-branch.model';
import { Holiday } from '../modules/holiday/entities/holiday.model';
import { FestivalPosterSetting } from '../modules/festival-poster/entities/festival-poster-setting.model';
import { FestivalPoster } from '../modules/festival-poster/entities/festival-poster.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Appointment,
      AppointmentStatusHistory,
      TreatmentPlan,
      TreatmentPlanPhase,
      Invoice,
      InvoiceLineItem,
      Payment,
      Expense,
      ExpenseCategory,
      Prescription,
      PrescriptionMedicine,
      MedicineMaster,
      InternshipInquiry,
      Plan,
      Subscription,
      SubscriptionPayment,
      WebsiteConfig,
      SupportTicket,
      PatientBranch,
      Holiday,
      FestivalPosterSetting,
      FestivalPoster,
    ]),
  ],
  exports: [SequelizeModule],
})
export class EntitiesModule { }
