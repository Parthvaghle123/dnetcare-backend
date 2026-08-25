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
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { DoctorLeave } from '../doctor/entities/doctor-leave.model';
import { DoctorSchedule } from '../doctor/entities/doctor-schedule.model';
import { AppointmentStatusHistory } from '../appointment/entities/appointment-status-history.model';
import { Prescription } from '../prescription/entities/prescription.model';
import { PrescriptionMedicine } from '../prescription/entities/prescription-medicine.model';
import { ConsultationDocument } from '../consultation/entities/consultation-document.model';
import { DentalChartEntry } from '../consultation/entities/dental-chart-entry.model';
import { TreatmentPlanPhase } from '../treatment/entities/treatment-plan-phase.model';
import { InvoiceLineItem } from '../billing/entities/invoice-line-item.model';
import { PatientMedicalCondition } from '../patient/entities/patient-medical-condition.model';
import { SupportTicket } from '../support/entities/support.model';
import { Subscription } from '../subscription/entities/subscription.model';
import { SubscriptionPayment } from '../subscription/entities/subscription-payment.model';
import { WebsiteConfig } from '../website/entities/website-config.model';
import { InternshipInquiry } from '../internship/entities/internship-inquiry.model';
import { InternshipExperience } from '../internship/entities/internship-experience.model';
import { NotificationLog } from '../notification/entities/notification-log.model';
import { ExpenseCategory } from '../finance/entities/expense-category.model';
import { ProcedureCatalog } from '../catalog/entities/procedure-catalog.model';
import { MedicalConditionMaster } from '../patient/entities/medical-condition-master.model';

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
      DoctorProfile,
      DoctorLeave,
      DoctorSchedule,
      AppointmentStatusHistory,
      Prescription,
      PrescriptionMedicine,
      ConsultationDocument,
      DentalChartEntry,
      TreatmentPlanPhase,
      InvoiceLineItem,
      PatientMedicalCondition,
      SupportTicket,
      Subscription,
      SubscriptionPayment,
      WebsiteConfig,
      InternshipInquiry,
      InternshipExperience,
      NotificationLog,
      ExpenseCategory,
      ProcedureCatalog,
      MedicalConditionMaster,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
