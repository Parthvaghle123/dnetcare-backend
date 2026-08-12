import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import dayjs from 'dayjs';
import { StatusCode } from '../../common/enums/status-code.enum';
import { User, UserRole, UserStatus } from '../auth/entities/user.model';
import { Organization } from '../organization/entities/organization.model';
import { Branch } from '../organization/entities/branch.model';
import { Appointment, AppointmentStatus } from '../appointment/entities/appointment.model';
import { Patient } from '../patient/entities/patient.model';
import { Plan } from '../subscription/entities/plan.model';
import { Invoice } from '../billing/entities/invoice.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { TreatmentPlan } from '../treatment/entities/treatment-plan.model';
import { Payment } from '../billing/entities/payment.model';
import { Expense } from '../finance/entities/expense.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { RefreshToken } from '../auth/entities/refresh-token.model';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Organization) private orgModel: typeof Organization,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(Appointment) private appointmentModel: typeof Appointment,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Plan) private planModel: typeof Plan,
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(TreatmentPlan) private treatmentPlanModel: typeof TreatmentPlan,
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
          role: { [Op.ne]: 'MAIN_ADMIN' as any },
        },
        include: [{ model: Organization, attributes: ['name'] }],
        order: [['created_at', 'DESC']],
      });
      return users;
    } catch (error) {
      this.logger.error('[getAllUsers] Error:', error);
      throw new HttpException('Failed to fetch users.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async toggleUserStatus(userId: string, is_active: boolean) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new HttpException('User not found.', StatusCode.NOT_FOUND);
      }

      if (user.role === ('MAIN_ADMIN' as any) || user.email === 'dentcare360.official@gmail.com') {
        throw new HttpException('Cannot modify default MAIN_ADMIN account.', StatusCode.FORBIDDEN);
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
      throw new HttpException('Failed to update user status.', StatusCode.INTERNAL_SERVER_ERROR);
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
      throw new HttpException('Failed to fetch plans.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async createPlan(dto: any) {
    try {
      return await this.planModel.create(dto);
    } catch (error) {
      this.logger.error('[createPlan] Error:', error);
      throw new HttpException('Failed to create plan.', StatusCode.INTERNAL_SERVER_ERROR);
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
      throw new HttpException('Failed to update plan.', StatusCode.INTERNAL_SERVER_ERROR);
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
        return await this.getUserSpecificStats(userId, appointmentPeriod, treatmentPeriod, financePeriod);
      } else {
        return await this.getSystemWideStats(appointmentPeriod, treatmentPeriod, financePeriod);
      }
    } catch (error) {
      this.logger.error('[getDashboardStats] Error:', error);
      throw new HttpException('Failed to load dashboard data.', StatusCode.INTERNAL_SERVER_ERROR);
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
    const totalClinics = await this.branchModel.count({ where: { is_active: true } });
    const totalUsers = await this.userModel.count({
      where: { is_deleted: false, role: { [Op.ne]: 'MAIN_ADMIN' as any } },
    });
    const totalAppointments = await this.appointmentModel.count();
    const totalPatients = await this.patientModel.count();

    // 2. Growth Rates calculation
    const growth = {
      clinics: await this.calculateGrowth(this.branchModel, startOfCurrentMonth, startOfLastMonth, endOfLastMonth, { is_active: true }),
      users: await this.calculateGrowth(this.userModel, startOfCurrentMonth, startOfLastMonth, endOfLastMonth, { is_deleted: false, role: { [Op.ne]: 'MAIN_ADMIN' as any } }),
      appointments: await this.calculateGrowth(this.appointmentModel, startOfCurrentMonth, startOfLastMonth, endOfLastMonth),
      patients: await this.calculateGrowth(this.patientModel, startOfCurrentMonth, startOfLastMonth, endOfLastMonth),
    };

    // 3. Appointment Overview (date range check)
    const appointmentOverview = await this.getAppointmentOverviewData(appointmentPeriod);

    // 4. Appointment Status Distribution
    const appointmentStatus = await this.getAppointmentStatusDistribution();

    // 5. Recent Appointments
    const recentAppointments = await this.getRecentAppointmentsList();

    // 6. Profit & Loss Overview
    const profitLoss = await this.getProfitLossTrend(financePeriod);

    return {
      stats: {
        totalClinics,
        totalUsers,
        totalAppointments,
        totalPatients,
      },
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
    const userBranches = await this.userBranchModel.findAll({ where: { user_id: userId } });
    const branchIds = userBranches.map(b => b.branch_id);

    // 1. User Specific Metrics
    const totalClinics = branchIds.length;
    const totalPatients = await this.patientModel.count({ where: { organization_id: orgId } });
    const totalAppointments = await this.appointmentModel.count({ where: { doctor_id: userId } });
    const totalInvoices = await this.invoiceModel.count({ where: { organization_id: orgId } });
    const totalTreatments = await this.treatmentPlanModel.count({ where: { organization_id: orgId } });
    const totalConsultations = await this.consultationModel.count({ where: { organization_id: orgId } });

    // 2. User Specific Appointment Overview
    const appointmentOverview = await this.getAppointmentOverviewData(appointmentPeriod, { doctor_id: userId });

    // 3. User Specific Appointment Status
    const appointmentStatus = await this.getAppointmentStatusDistribution({ doctor_id: userId });

    // 4. User Specific Profit & Loss (by their Organization)
    const profitLoss = await this.getProfitLossTrend(financePeriod, orgId || undefined);

    return {
      stats: {
        totalClinics,
        totalPatients,
        totalAppointments,
        totalInvoices,
        totalTreatments,
        totalConsultations,
      },
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

      return Math.round(((currentMonthCount - lastMonthCount) / lastMonthCount) * 100);
    } catch (e) {
      return 0;
    }
  }

  private async getAppointmentOverviewData(period: string, extraWhere: any = {}) {
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
        key = dayjs().subtract(1, 'month').startOf('month').add(i, 'day').format(format);
      } else {
        key = dayjs().subtract(diffCount - 1 - i, diffUnit).format(format);
      }
      groups[key] = 0;
    }

    appts.forEach((appt) => {
      const key = dayjs(appt.scheduled_at).format(format);
      if (groups[key] !== undefined) {
        groups[key]++;
      }
    });

    return Object.keys(groups).map(key => ({
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
      if (s === AppointmentStatus.CONFIRMED || s === AppointmentStatus.RESCHEDULED) {
        stats.confirmed++;
      } else if (s === AppointmentStatus.COMPLETED || s === AppointmentStatus.IN_PROGRESS) {
        stats.completed++;
      } else if (s === AppointmentStatus.SCHEDULED) {
        stats.pending++;
      } else if (s === AppointmentStatus.CANCELLED || s === AppointmentStatus.NO_SHOW) {
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
      if (appt.status === AppointmentStatus.CONFIRMED || appt.status === AppointmentStatus.RESCHEDULED) {
        statusStr = 'Confirmed';
      } else if (appt.status === AppointmentStatus.COMPLETED || appt.status === AppointmentStatus.IN_PROGRESS) {
        statusStr = 'Completed';
      } else if (appt.status === AppointmentStatus.CANCELLED || appt.status === AppointmentStatus.NO_SHOW) {
        statusStr = 'Cancelled';
      }

      // Format UTC date & time to remain consistent with frontend utilities
      const scheduledDate = new Date(appt.scheduled_at);
      const utcYear = scheduledDate.getUTCFullYear();
      const utcMonth = scheduledDate.getUTCMonth();
      const utcDay = scheduledDate.getUTCDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${utcDay < 10 ? '0' + utcDay : utcDay} ${months[utcMonth]} ${utcYear}`;

      let utcHours = scheduledDate.getUTCHours();
      const utcMinutes = scheduledDate.getUTCMinutes();
      const ampm = utcHours >= 12 ? 'PM' : 'AM';
      utcHours = utcHours % 12;
      utcHours = utcHours ? utcHours : 12;
      const timeStr = `${utcHours < 10 ? '0' + utcHours : utcHours}:${utcMinutes < 10 ? '0' + utcMinutes : utcMinutes} ${ampm}`;

      return {
        id: appt.id,
        patientName: appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Unknown Patient',
        doctorName: appt.doctor ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}` : 'Unknown Doctor',
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

    const payments = await this.paymentModel.findAll({ where: wherePayment, raw: true });
    const expenses = await this.expenseModel.findAll({ where: whereExpense, raw: true });

    const trendMap: { [key: string]: { income: number; expenses: number; net_profit: number } } = {};

    for (let i = 0; i < diffCount; i++) {
      let key = '';
      if (period === 'today') {
        key = dayjs().startOf('day').add(i, 'hour').format(format);
      } else {
        key = dayjs().subtract(diffCount - 1 - i, diffUnit).format(format);
      }
      trendMap[key] = { income: 0, expenses: 0, net_profit: 0 };
    }

    payments.forEach((payment) => {
      const key = dayjs(payment.payment_date).format(format);
      if (trendMap[key]) {
        trendMap[key].income += parseFloat(payment.amount as any || 0);
      }
    });

    expenses.forEach((expense) => {
      const key = dayjs(expense.expense_date).format(format);
      if (trendMap[key]) {
        trendMap[key].expenses += parseFloat(expense.amount as any || 0);
      }
    });

    return Object.keys(trendMap).map(key => {
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
