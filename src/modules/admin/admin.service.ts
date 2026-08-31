import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import dayjs from 'dayjs';
import { Sequelize } from 'sequelize-typescript';
import { StatusCode } from '../../common/enums/status-code.enum';
import { User, UserRole, UserStatus } from '../auth/entities/user.model';
import { Organization } from '../organization/entities/organization.model';
import { Branch } from '../organization/entities/branch.model';
import {
  Appointment,
  AppointmentStatus,
} from '../appointment/entities/appointment.model';
import { Patient } from '../patient/entities/patient.model';
import { Plan } from '../subscription/entities/plan.model';
import { Invoice } from '../billing/entities/invoice.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { TreatmentPlan } from '../treatment/entities/treatment-plan.model';
import { Payment } from '../billing/entities/payment.model';
import { Expense } from '../finance/entities/expense.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { RefreshToken } from '../auth/entities/refresh-token.model';

// Additional imports for cascade deletion
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

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private sequelize: Sequelize,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Organization) private orgModel: typeof Organization,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(Appointment) private appointmentModel: typeof Appointment,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Plan) private planModel: typeof Plan,
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(TreatmentPlan)
    private treatmentPlanModel: typeof TreatmentPlan,
    @InjectModel(Payment) private paymentModel: typeof Payment,
    @InjectModel(Expense) private expenseModel: typeof Expense,
    @InjectModel(UserBranch) private userBranchModel: typeof UserBranch,
    @InjectModel(RefreshToken) private refreshTokenModel: typeof RefreshToken,
  ) {}

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async getAllUsers() {
    try {
      const users = await this.userModel.findAll({
        where: {
          is_deleted: false,
          role: UserRole.OWNER,
        },
        include: [{ model: Organization, attributes: ['name'] }],
        order: [['created_at', 'DESC']],
      });
      return users;
    } catch (error) {
      this.logger.error('[getAllUsers] Error:', error);
      throw new HttpException(
        'Failed to fetch users.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async toggleUserStatus(userId: string, is_active: boolean) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new HttpException('User not found.', StatusCode.NOT_FOUND);
      }

      if (
        user.role === ('MAIN_ADMIN' as any) ||
        user.email === 'dentcare360.official@gmail.com'
      ) {
        throw new HttpException(
          'Cannot modify default MAIN_ADMIN account.',
          StatusCode.FORBIDDEN,
        );
      }

      await user.update({
        is_active,
        status: is_active ? UserStatus.ACTIVE : UserStatus.INACTIVE,
      });

      // If deactivating, revoke all sessions
      if (!is_active) {
        await this.refreshTokenModel.update(
          { is_revoked: true },
          { where: { user_id: userId, is_revoked: false } },
        );
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[toggleUserStatus] Error:', error);
      throw new HttpException(
        'Failed to update user status.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteUser(userId: string) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new HttpException('User not found.', StatusCode.NOT_FOUND);
      }

      if (
        user.email === 'dentcare360.official@gmail.com' ||
        user.role === ('MAIN_ADMIN' as any)
      ) {
        throw new HttpException(
          'Deletion of default MAIN_ADMIN user is not allowed.',
          StatusCode.FORBIDDEN,
        );
      }


      const existingTables = await this.sequelize.getQueryInterface().showAllTables();
      const safeDestroy = async (model: any, options: any) => {
        // tableName can be on the class itself or on the prototype/instance
        const tableName = model.tableName ?? model.getTableName?.() ?? null;
        if (!tableName) {
          this.logger.warn(`safeDestroy: could not resolve tableName for model`);
          return;
        }
        if (existingTables.includes(tableName)) {
          await model.destroy(options);
        } else {
          this.logger.warn(`Skipping destroy for missing table: ${tableName}`);
        }
      };

      // Execute everything inside a transaction
      await this.sequelize.transaction(async (transaction) => {
        if (user.role === UserRole.OWNER && user.organization_id) {
          const orgId = user.organization_id;

          // 1. Get branches for subscription/doctor leaves schedules deletion
          const branches = await this.branchModel.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const branchIds = branches.map((b) => b.id);

          // 2. Get users in organization
          const orgUsers = await this.userModel.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const orgUserIds = orgUsers.map((u) => u.id);

          // 3. Get patients in organization
          const patients = await this.patientModel.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const patientIds = patients.map((p) => p.id);

          // 4. Get consultations
          const consultations = await this.consultationModel.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const consultationIds = consultations.map((c) => c.id);

          // 5. Get treatment plans
          const treatmentPlans = await this.treatmentPlanModel.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const treatmentPlanIds = treatmentPlans.map((tp) => tp.id);

          // 6. Get invoices
          const invoices = await this.invoiceModel.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const invoiceIds = invoices.map((inv) => inv.id);

          // 7. Get prescriptions (by patient)
          const prescriptions = patientIds.length > 0 ? await Prescription.findAll({
            where: { patient_id: { [Op.in]: patientIds } },
            transaction,
          }) : [];
          const prescriptionIds = prescriptions.map((pr) => pr.id);

          // 8. Get appointments
          const appointments = await this.appointmentModel.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const appointmentIds = appointments.map((app) => app.id);

          // 9. Get subscriptions
          const subscriptions = await Subscription.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const subscriptionIds = subscriptions.map((s) => s.id);

          // 10. Get internship inquiries
          const inquiries = await InternshipInquiry.findAll({
            where: { organization_id: orgId },
            transaction,
          });
          const inquiryIds = inquiries.map((inq) => inq.id);

          // Delete dependent tables in order to resolve foreign keys:
          
          // - Subscription payments
          if (subscriptionIds.length > 0) {
            await safeDestroy(SubscriptionPayment, {
              where: { subscription_id: { [Op.in]: subscriptionIds } },
              transaction,
            });
          }
          // - Subscriptions
          await safeDestroy(Subscription, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Website configs
          await safeDestroy(WebsiteConfig, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Internship experience
          if (inquiryIds.length > 0) {
            await safeDestroy(InternshipExperience, {
              where: { inquiry_id: { [Op.in]: inquiryIds } },
              transaction,
            });
          }
          // - Internship inquiries
          await safeDestroy(InternshipInquiry, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Procedure catalogs
          await safeDestroy(ProcedureCatalog, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Payments
          await safeDestroy(this.paymentModel, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Invoice line items
          if (invoiceIds.length > 0) {
            await safeDestroy(InvoiceLineItem, {
              where: { invoice_id: { [Op.in]: invoiceIds } },
              transaction,
            });
          }
          // - Invoices
          await safeDestroy(this.invoiceModel, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Prescription medicines
          if (prescriptionIds.length > 0) {
            await safeDestroy(PrescriptionMedicine, {
              where: { prescription_id: { [Op.in]: prescriptionIds } },
              transaction,
            });
          }
          // - Prescriptions
          if (patientIds.length > 0) {
            await safeDestroy(Prescription, {
              where: { patient_id: { [Op.in]: patientIds } },
              transaction,
            });
          }

          // - Dental chart entries
          if (consultationIds.length > 0) {
            await safeDestroy(DentalChartEntry, {
              where: { consultation_id: { [Op.in]: consultationIds } },
              transaction,
            });
          }
          // - Consultation documents
          await safeDestroy(ConsultationDocument, {
            where: { organization_id: orgId },
            transaction,
          });
          // - Consultations
          await safeDestroy(this.consultationModel, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Treatment plan phases
          if (treatmentPlanIds.length > 0) {
            await safeDestroy(TreatmentPlanPhase, {
              where: { treatment_plan_id: { [Op.in]: treatmentPlanIds } },
              transaction,
            });
          }
          // - Treatment plans
          await safeDestroy(this.treatmentPlanModel, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Appointment status history
          if (appointmentIds.length > 0) {
            await safeDestroy(AppointmentStatusHistory, {
              where: { appointment_id: { [Op.in]: appointmentIds } },
              transaction,
            });
          }
          // - Appointments
          await safeDestroy(this.appointmentModel, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Patient medical conditions
          if (patientIds.length > 0) {
            await safeDestroy(PatientMedicalCondition, {
              where: { patient_id: { [Op.in]: patientIds } },
              transaction,
            });
          }
          // - Notification logs
          const hasNotificationLogs = await this.sequelize.getQueryInterface().tableExists('notification_logs');
          if (hasNotificationLogs) {
            await safeDestroy(NotificationLog, {
              where: { organization_id: orgId },
              transaction,
            });
          }
          // - Patients
          await safeDestroy(this.patientModel, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Expenses
          await safeDestroy(this.expenseModel, {
            where: { organization_id: orgId },
            transaction,
          });
          // - Expense categories (only organization-specific categories)
          await safeDestroy(ExpenseCategory, {
            where: { organization_id: orgId },
            transaction,
          });
          
          // - Medical Condition Masters
          await safeDestroy(MedicalConditionMaster, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Doctor leaves and schedules
          if (branchIds.length > 0) {
            await safeDestroy(DoctorLeave, {
              where: { branch_id: { [Op.in]: branchIds } },
              transaction,
            });
            await safeDestroy(DoctorSchedule, {
              where: { branch_id: { [Op.in]: branchIds } },
              transaction,
            });
          }

          // - Doctor profiles, refresh tokens, user branches
          if (orgUserIds.length > 0) {
            await safeDestroy(DoctorProfile, {
              where: { user_id: { [Op.in]: orgUserIds } },
              transaction,
            });
            await safeDestroy(this.refreshTokenModel, {
              where: { user_id: { [Op.in]: orgUserIds } },
              transaction,
            });
            await safeDestroy(this.userBranchModel, {
              where: { user_id: { [Op.in]: orgUserIds } },
              transaction,
            });
          }

          // - Support tickets
          const supportWhere: any = { organization_id: orgId };
          if (orgUserIds.length > 0) {
            supportWhere[Op.or] = [
              { organization_id: orgId },
              { user_id: { [Op.in]: orgUserIds } },
            ];
            delete supportWhere.organization_id;
          }
          await safeDestroy(SupportTicket, {
            where: supportWhere,
            transaction,
          });

          // - Branches
          await safeDestroy(this.branchModel, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Users (all clinic users)
          await safeDestroy(this.userModel, {
            where: { organization_id: orgId },
            transaction,
          });

          // - Organization
          await safeDestroy(this.orgModel, {
            where: { id: orgId },
            transaction,
          });

        } else {
          // If not an OWNER, delete only records belonging to this specific user:
          const userId = user.id;

          // 1. Support tickets
          await safeDestroy(SupportTicket, {
            where: { user_id: userId },
            transaction,
          });
          
          // 2. Refresh tokens & User branches
          await safeDestroy(this.refreshTokenModel, {
            where: { user_id: userId },
            transaction,
          });
          await safeDestroy(this.userBranchModel, {
            where: { user_id: userId },
            transaction,
          });

          // 3. Doctor profiles, leaves, schedules
          await safeDestroy(DoctorProfile, {
            where: { user_id: userId },
            transaction,
          });
          await safeDestroy(DoctorLeave, {
            where: { [Op.or]: [{ doctor_id: userId }, { created_by: userId }] },
            transaction,
          });
          await safeDestroy(DoctorSchedule, {
            where: { doctor_id: userId },
            transaction,
          });

          // 4. Appointments & History
          const userAppointments = await this.appointmentModel.findAll({
            where: { [Op.or]: [{ doctor_id: userId }, { created_by: userId }] },
            transaction,
          });
          const userAppointmentIds = userAppointments.map((app) => app.id);
          if (userAppointmentIds.length > 0) {
            await safeDestroy(AppointmentStatusHistory, {
              where: { appointment_id: { [Op.in]: userAppointmentIds } },
              transaction,
            });
            await safeDestroy(this.appointmentModel, {
              where: { id: { [Op.in]: userAppointmentIds } },
              transaction,
            });
          }
          // Set status history changed_by = null
          await AppointmentStatusHistory.update(
            { changed_by: null },
            { where: { changed_by: userId }, transaction },
          );

          // 5. Prescriptions
          const userPrescriptions = await Prescription.findAll({
            where: { doctor_id: userId },
            transaction,
          });
          const userPrescriptionIds = userPrescriptions.map((pr) => pr.id);
          if (userPrescriptionIds.length > 0) {
            await safeDestroy(PrescriptionMedicine, {
              where: { prescription_id: { [Op.in]: userPrescriptionIds } },
              transaction,
            });
            await safeDestroy(Prescription, {
              where: { id: { [Op.in]: userPrescriptionIds } },
              transaction,
            });
          }

          // 6. Consultations & Documents & Dental Chart
          const userConsultations = await this.consultationModel.findAll({
            where: { doctor_id: userId },
            transaction,
          });
          const userConsultationIds = userConsultations.map((c) => c.id);
          if (userConsultationIds.length > 0) {
            await safeDestroy(DentalChartEntry, {
              where: { consultation_id: { [Op.in]: userConsultationIds } },
              transaction,
            });
            await safeDestroy(this.consultationModel, {
              where: { id: { [Op.in]: userConsultationIds } },
              transaction,
            });
          }
          await ConsultationDocument.update(
            { uploaded_by: null },
            { where: { uploaded_by: userId }, transaction },
          );

          // 7. Treatment plans
          const userTreatmentPlans = await this.treatmentPlanModel.findAll({
            where: { created_by: userId },
            transaction,
          });
          const userTreatmentPlanIds = userTreatmentPlans.map((tp) => tp.id);
          if (userTreatmentPlanIds.length > 0) {
            await safeDestroy(TreatmentPlanPhase, {
              where: { treatment_plan_id: { [Op.in]: userTreatmentPlanIds } },
              transaction,
            });
            await safeDestroy(this.treatmentPlanModel, {
              where: { id: { [Op.in]: userTreatmentPlanIds } },
              transaction,
            });
          }
          await TreatmentPlanPhase.update(
            { completed_by: null },
            { where: { completed_by: userId }, transaction },
          );

          // 8. Invoices, Payments, Expenses
          const userInvoices = await this.invoiceModel.findAll({
            where: { created_by: userId },
            transaction,
          });
          const userInvoiceIds = userInvoices.map((inv) => inv.id);
          if (userInvoiceIds.length > 0) {
            await safeDestroy(InvoiceLineItem, {
              where: { invoice_id: { [Op.in]: userInvoiceIds } },
              transaction,
            });
            await safeDestroy(this.invoiceModel, {
              where: { id: { [Op.in]: userInvoiceIds } },
              transaction,
            });
          }
          await this.paymentModel.update(
            { received_by: null },
            { where: { received_by: userId }, transaction },
          );
          await safeDestroy(this.expenseModel, {
            where: { created_by: userId },
            transaction,
          });

          // 9. PatientMedicalCondition
          await PatientMedicalCondition.update(
            { recorded_by: null },
            { where: { recorded_by: userId }, transaction },
          );

          // 10. Patients created/referred
          await Patient.update(
            { created_by: null },
            { where: { created_by: userId }, transaction },
          );
          await Patient.update(
            { referred_by_id: null },
            { where: { referred_by_id: userId }, transaction },
          );

          // 11. Delete the user
          // Destroy the user instance directly (not via safeDestroy which needs a class)
          await user.destroy({ transaction });
        }
      });

      return { success: true, message: 'User permanently deleted.' };
    } catch (error) {
      this.logger.error('[deleteUser] Error:', error);
      if (error instanceof HttpException) throw error;
      // Expose the real DB error message so the frontend toast is informative
      const detail = error?.parent?.message || error?.original?.message || error?.message;
      throw new HttpException(
        { message: detail || 'Failed to delete user and associated records.', error: 'DELETE_FAILED' },
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================================
  // PLAN MANAGEMENT
  // ==========================================

  async getPlans() {
    try {
      return await this.planModel.findAll({
        order: [['price_monthly', 'ASC']],
      });
    } catch (error) {
      this.logger.error('[getPlans] Error:', error);
      throw new HttpException(
        'Failed to fetch plans.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createPlan(dto: any) {
    try {
      return await this.planModel.create(dto);
    } catch (error) {
      this.logger.error('[createPlan] Error:', error);
      throw new HttpException(
        'Failed to create plan.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePlan(planId: string, dto: any) {
    try {
      const plan = await this.planModel.findByPk(planId);
      if (!plan) {
        throw new HttpException('Plan not found.', StatusCode.NOT_FOUND);
      }
      await plan.update(dto);
      return plan;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[updatePlan] Error:', error);
      throw new HttpException(
        'Failed to update plan.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deactivatePlan(planId: string) {
    throw new HttpException(
      'Plans cannot be deleted or deactivated from the database.',
      StatusCode.FORBIDDEN,
    );
  }

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  async getDashboardStats(
    appointmentPeriod: string,
    treatmentPeriod: string,
    financePeriod: string,
    userId?: string,
  ) {
    try {
      if (userId) {
        return await this.getUserSpecificStats(
          userId,
          appointmentPeriod,
          treatmentPeriod,
          financePeriod,
        );
      } else {
        return await this.getSystemWideStats(
          appointmentPeriod,
          treatmentPeriod,
          financePeriod,
        );
      }
    } catch (error) {
      this.logger.error('[getDashboardStats] Error:', error);
      throw new HttpException(
        'Failed to load dashboard data.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getSystemWideStats(
    appointmentPeriod: string,
    treatmentPeriod: string,
    financePeriod: string,
  ) {
    // Current month and last month boundaries
    const now = dayjs();
    const startOfCurrentMonth = now.startOf('month').toDate();
    const startOfLastMonth = now.subtract(1, 'month').startOf('month').toDate();
    const endOfLastMonth = now.subtract(1, 'month').endOf('month').toDate();

    // 1. Total Metrics
    const totalClinics = await this.branchModel.count({
      where: { is_active: true },
    });
    const totalUsers = await this.userModel.count({
      where: { is_deleted: false, role: { [Op.ne]: 'MAIN_ADMIN' as any } },
    });
    const totalAppointments = await this.appointmentModel.count();
    const totalPatients = await this.patientModel.count();

    // 2. Growth Rates calculation
    const growth = {
      clinics: await this.calculateGrowth(
        this.branchModel,
        startOfCurrentMonth,
        startOfLastMonth,
        endOfLastMonth,
        { is_active: true },
      ),
      users: await this.calculateGrowth(
        this.userModel,
        startOfCurrentMonth,
        startOfLastMonth,
        endOfLastMonth,
        { is_deleted: false, role: { [Op.ne]: 'MAIN_ADMIN' as any } },
      ),
      appointments: await this.calculateGrowth(
        this.appointmentModel,
        startOfCurrentMonth,
        startOfLastMonth,
        endOfLastMonth,
      ),
      patients: await this.calculateGrowth(
        this.patientModel,
        startOfCurrentMonth,
        startOfLastMonth,
        endOfLastMonth,
      ),
    };

    // 3. Appointment Overview (date range check)
    const appointmentOverview =
      await this.getAppointmentOverviewData(appointmentPeriod);

    // 4. Appointment Status Distribution
    const appointmentStatus = await this.getAppointmentStatusDistribution();

    // 5. Recent Appointments
    const recentAppointments = await this.getRecentAppointmentsList();

    // 6. Profit & Loss Overview
    const profitLoss = await this.getProfitLossTrend(financePeriod);

    // 7. Plan Statistics
    const plans = await this.planModel.findAll({
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          where: { status: 'ACTIVE' },
          required: false,
        },
      ],
      order: [['price_monthly', 'ASC']],
    });

    const planStats = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      activeCount: plan.subscriptions ? plan.subscriptions.length : 0,
    }));

    return {
      stats: {
        totalClinics,
        totalUsers,
        totalAppointments,
        totalPatients,
      },
      planStats,
      growth,
      appointmentOverview,
      appointmentStatus,
      recentAppointments,
      profitLoss,
    };
  }

  private async getUserSpecificStats(
    userId: string,
    appointmentPeriod: string,
    treatmentPeriod: string,
    financePeriod: string,
  ) {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new HttpException('User not found.', StatusCode.NOT_FOUND);
    }

    const orgId = user.organization_id;
    const userBranches = await this.userBranchModel.findAll({
      where: { user_id: userId },
    });
    const branchIds = userBranches.map((b) => b.branch_id);

    // 1. User Specific Metrics
    const totalClinics = branchIds.length;
    const totalPatients = await this.patientModel.count({
      where: { organization_id: orgId },
    });
    const totalAppointments = await this.appointmentModel.count({
      where: { doctor_id: userId },
    });
    const totalInvoices = await this.invoiceModel.count({
      where: { organization_id: orgId },
    });
    const totalTreatments = await this.treatmentPlanModel.count({
      where: { organization_id: orgId },
    });
    const totalConsultations = await this.consultationModel.count({
      where: { organization_id: orgId },
    });

    // 2. User Specific Appointment Overview
    const appointmentOverview = await this.getAppointmentOverviewData(
      appointmentPeriod,
      { doctor_id: userId },
    );

    // 3. User Specific Appointment Status
    const appointmentStatus = await this.getAppointmentStatusDistribution({
      doctor_id: userId,
    });

    // 4. User Specific Profit & Loss (by their Organization)
    const profitLoss = await this.getProfitLossTrend(
      financePeriod,
      orgId || undefined,
    );

    return {
      stats: {
        totalClinics,
        totalPatients,
        totalAppointments,
        totalInvoices,
        totalTreatments,
        totalConsultations,
      },
      planStats: [],
      appointmentOverview,
      appointmentStatus,
      profitLoss,
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async calculateGrowth(
    model: any,
    startOfCurrentMonth: Date,
    startOfLastMonth: Date,
    endOfLastMonth: Date,
    extraWhere: any = {},
  ): Promise<number> {
    try {
      const currentMonthCount = await model.count({
        where: {
          ...extraWhere,
          created_at: { [Op.gte]: startOfCurrentMonth },
        },
      });

      const lastMonthCount = await model.count({
        where: {
          ...extraWhere,
          created_at: { [Op.between]: [startOfLastMonth, endOfLastMonth] },
        },
      });

      if (lastMonthCount === 0) {
        return currentMonthCount > 0 ? 100 : 0;
      }

      return Math.round(
        ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100,
      );
    } catch (e) {
      return 0;
    }
  }

  private async getAppointmentOverviewData(
    period: string,
    extraWhere: any = {},
  ) {
    let dateFrom = dayjs().subtract(7, 'day').startOf('day').toDate();
    let format = 'ddd'; // E.g., Mon, Tue
    let diffUnit: dayjs.ManipulateType = 'day';
    let diffCount = 7;

    if (period === 'today') {
      dateFrom = dayjs().startOf('day').toDate();
      format = 'HH:00';
      diffUnit = 'hour';
      diffCount = 24;
    } else if (period === 'month') {
      dateFrom = dayjs().subtract(30, 'day').startOf('day').toDate();
      format = 'DD MMM';
      diffUnit = 'day';
      diffCount = 30;
    } else if (period === 'last_month') {
      dateFrom = dayjs().subtract(1, 'month').startOf('month').toDate();
      const endOfLastMonth = dayjs().subtract(1, 'month').endOf('month');
      format = 'DD MMM';
      diffUnit = 'day';
      diffCount = endOfLastMonth.diff(dayjs(dateFrom), 'day') + 1;
    }

    const appts = await this.appointmentModel.findAll({
      where: {
        ...extraWhere,
        scheduled_at: { [Op.gte]: dateFrom },
      },
      attributes: ['scheduled_at'],
      raw: true,
    });

    const groups: { [key: string]: number } = {};

    // Pre-populate keys to ensure the chart shows continuous points
    for (let i = 0; i < diffCount; i++) {
      let key = '';
      if (period === 'today') {
        key = dayjs().startOf('day').add(i, 'hour').format(format);
      } else if (period === 'last_month') {
        key = dayjs()
          .subtract(1, 'month')
          .startOf('month')
          .add(i, 'day')
          .format(format);
      } else {
        key = dayjs()
          .subtract(diffCount - 1 - i, diffUnit)
          .format(format);
      }
      groups[key] = 0;
    }

    appts.forEach((appt) => {
      const key = dayjs(appt.scheduled_at).format(format);
      if (groups[key] !== undefined) {
        groups[key]++;
      }
    });

    return Object.keys(groups).map((key) => ({
      day: key,
      count: groups[key],
    }));
  }

  private async getAppointmentStatusDistribution(extraWhere: any = {}) {
    const appts = await this.appointmentModel.findAll({
      where: extraWhere,
      attributes: ['status'],
      raw: true,
    });

    const stats = {
      confirmed: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
      total: appts.length,
    };

    appts.forEach((appt) => {
      const s = appt.status;
      if (
        s === AppointmentStatus.CONFIRMED ||
        s === AppointmentStatus.RESCHEDULED
      ) {
        stats.confirmed++;
      } else if (
        s === AppointmentStatus.COMPLETED ||
        s === AppointmentStatus.IN_PROGRESS
      ) {
        stats.completed++;
      } else if (s === AppointmentStatus.SCHEDULED) {
        stats.pending++;
      } else if (
        s === AppointmentStatus.CANCELLED ||
        s === AppointmentStatus.NO_SHOW
      ) {
        stats.cancelled++;
      }
    });

    return stats;
  }

  private async getRecentAppointmentsList() {
    const appts = await this.appointmentModel.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [
        { model: Patient, attributes: ['first_name', 'last_name'] },
        { model: User, as: 'doctor', attributes: ['first_name', 'last_name'] },
      ],
    });

    return appts.map((appt) => {
      let statusStr = 'Pending';
      if (
        appt.status === AppointmentStatus.CONFIRMED ||
        appt.status === AppointmentStatus.RESCHEDULED
      ) {
        statusStr = 'Confirmed';
      } else if (
        appt.status === AppointmentStatus.COMPLETED ||
        appt.status === AppointmentStatus.IN_PROGRESS
      ) {
        statusStr = 'Completed';
      } else if (
        appt.status === AppointmentStatus.CANCELLED ||
        appt.status === AppointmentStatus.NO_SHOW
      ) {
        statusStr = 'Cancelled';
      }

      // Format UTC date & time to remain consistent with frontend utilities
      const scheduledDate = new Date(appt.scheduled_at);
      const utcYear = scheduledDate.getUTCFullYear();
      const utcMonth = scheduledDate.getUTCMonth();
      const utcDay = scheduledDate.getUTCDate();
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const dateStr = `${utcDay < 10 ? '0' + utcDay : utcDay} ${months[utcMonth]} ${utcYear}`;

      let utcHours = scheduledDate.getUTCHours();
      const utcMinutes = scheduledDate.getUTCMinutes();
      const ampm = utcHours >= 12 ? 'PM' : 'AM';
      utcHours = utcHours % 12;
      utcHours = utcHours ? utcHours : 12;
      const timeStr = `${utcHours < 10 ? '0' + utcHours : utcHours}:${utcMinutes < 10 ? '0' + utcMinutes : utcMinutes} ${ampm}`;

      return {
        id: appt.id,
        patientName: appt.patient
          ? `${appt.patient.first_name} ${appt.patient.last_name}`
          : 'Unknown Patient',
        doctorName: appt.doctor
          ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}`
          : 'Unknown Doctor',
        date: dateStr,
        time: timeStr,
        status: statusStr,
      };
    });
  }

  private async getProfitLossTrend(period: string, organizationId?: string) {
    let dateFrom = dayjs().subtract(6, 'month').startOf('month').toDate();
    let format = 'MMM YYYY';
    let diffUnit: dayjs.ManipulateType = 'month';
    let diffCount = 6;

    if (period === 'today') {
      dateFrom = dayjs().startOf('day').toDate();
      format = 'HH:00';
      diffUnit = 'hour';
      diffCount = 24;
    } else if (period === 'week') {
      dateFrom = dayjs().subtract(7, 'day').startOf('day').toDate();
      format = 'DD MMM';
      diffUnit = 'day';
      diffCount = 7;
    } else if (period === 'month' || period === 'last_month') {
      dateFrom = dayjs().subtract(30, 'day').startOf('day').toDate();
      format = 'DD MMM';
      diffUnit = 'day';
      diffCount = 30;
    } else if (period === 'year') {
      dateFrom = dayjs().subtract(12, 'month').startOf('month').toDate();
      format = 'MMM YYYY';
      diffUnit = 'month';
      diffCount = 12;
    }

    const wherePayment: any = {
      payment_date: { [Op.gte]: dateFrom },
    };
    const whereExpense: any = {
      expense_date: { [Op.gte]: dateFrom },
    };

    if (organizationId) {
      wherePayment.organization_id = organizationId;
      whereExpense.organization_id = organizationId;
    }

    const payments = await this.paymentModel.findAll({
      where: wherePayment,
      raw: true,
    });
    const expenses = await this.expenseModel.findAll({
      where: whereExpense,
      raw: true,
    });

    const trendMap: {
      [key: string]: { income: number; expenses: number; net_profit: number };
    } = {};

    for (let i = 0; i < diffCount; i++) {
      let key = '';
      if (period === 'today') {
        key = dayjs().startOf('day').add(i, 'hour').format(format);
      } else {
        key = dayjs()
          .subtract(diffCount - 1 - i, diffUnit)
          .format(format);
      }
      trendMap[key] = { income: 0, expenses: 0, net_profit: 0 };
    }

    payments.forEach((payment) => {
      const key = dayjs(payment.payment_date).format(format);
      if (trendMap[key]) {
        trendMap[key].income += parseFloat((payment.amount as any) || 0);
      }
    });

    expenses.forEach((expense) => {
      const key = dayjs(expense.expense_date).format(format);
      if (trendMap[key]) {
        trendMap[key].expenses += parseFloat((expense.amount as any) || 0);
      }
    });

    return Object.keys(trendMap).map((key) => {
      const income = trendMap[key].income;
      const exp = trendMap[key].expenses;
      return {
        date: key,
        income: Math.round(income),
        expenses: Math.round(exp),
        net_profit: Math.round(income - exp),
      };
    });
  }
}
