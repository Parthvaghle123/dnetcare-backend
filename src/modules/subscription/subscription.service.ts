import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Op } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { Plan } from './entities/plan.model';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.model';
import {
  SubscriptionPayment,
  PaymentStatus,
} from './entities/subscription-payment.model';
import { User } from '../auth/entities/user.model';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { EmailService } from '../notification/email.service';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionService.name);
  private razorpay: any;

  constructor(
    @InjectModel(Plan) private readonly planModel: typeof Plan,
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(SubscriptionPayment)
    private readonly paymentModel: typeof SubscriptionPayment,
    @InjectModel(User) private readonly userModel: typeof User,
    private readonly emailService: EmailService,
  ) {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  async onModuleInit() {
    try {
      await this.planModel.sequelize?.query(
        `DROP TRIGGER IF EXISTS prevent_plans_delete_trigger ON plans;`,
      );
    } catch (err) {
      this.logger.warn(
        'Could not temporarily drop prevent_plans_delete_trigger: ' +
        err.message,
      );
    }

    try {
      await this.planModel.sequelize?.query(
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS allowed_features JSONB;`,
      );
    } catch (err) {
      this.logger.warn('Could not add allowed_features column: ' + err.message);
    }

    await this.seedPlans();

    try {
      // 1. Prevent DELETE or TRUNCATE on the plans table entirely
      await this.planModel.sequelize?.query(`
        CREATE OR REPLACE FUNCTION prevent_plans_delete()
        RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'Deleting or truncating plans data is strictly prohibited!';
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.planModel.sequelize?.query(`
        DROP TRIGGER IF EXISTS prevent_plans_delete_trigger ON plans;
        CREATE TRIGGER prevent_plans_delete_trigger
        BEFORE DELETE OR TRUNCATE ON plans
        FOR EACH STATEMENT
        EXECUTE FUNCTION prevent_plans_delete();
      `);

      // 2. Prevent DELETE of users with role = 'MAIN_ADMIN' and block TRUNCATE on the users table
      await this.planModel.sequelize?.query(`
        CREATE OR REPLACE FUNCTION prevent_main_admin_delete()
        RETURNS TRIGGER AS $$
        BEGIN
          IF OLD.role = 'MAIN_ADMIN' THEN
            RAISE EXCEPTION 'Main admin users cannot be deleted!';
          END IF;
          RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.planModel.sequelize?.query(`
        DROP TRIGGER IF EXISTS prevent_main_admin_delete_trigger ON users;
        CREATE TRIGGER prevent_main_admin_delete_trigger
        BEFORE DELETE ON users
        FOR EACH ROW
        EXECUTE FUNCTION prevent_main_admin_delete();
      `);

      await this.planModel.sequelize?.query(`
        CREATE OR REPLACE FUNCTION prevent_users_truncate()
        RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'Truncating users table is strictly prohibited!';
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.planModel.sequelize?.query(`
        DROP TRIGGER IF EXISTS prevent_users_truncate_trigger ON users;
        CREATE TRIGGER prevent_users_truncate_trigger
        BEFORE TRUNCATE ON users
        FOR EACH STATEMENT
        EXECUTE FUNCTION prevent_users_truncate();
      `);
    } catch (err) {
      this.logger.warn('Could not create protection triggers: ' + err.message);
    }
  }

  private async seedPlans() {
    const defaultPlans = [
      {
        id: '4c1a55fb-fad8-4535-b683-14b853bae58a',
        name: 'Pro Plan',
        description:
          'For growing clinics & single location practices. 1 Branch Mgmt, 100 Patients Mgmt, 300 Appointments, 10 AI Event Poster Credits, Finance Mgmt, Procedure Catalog Mgmt, WhatsApp SMS Integration, Invoice Mgmt, Staff Mgmt.',
        price_monthly: 1999.0,
        type: 'SOFTWARE',
        max_branches: 1,
        max_patients: 100,
        max_appointments: 300,
        is_active: true,
        allowed_features: [
          'dashboard_access',
          'branch_management',
          'finance_mgmt',
          'procedure_catalog',
          'whatsapp_sms',
          'invoice_mgmt',
          'billing_mgmt',
          'staff_mgmt',
          'settings_access',
          'consultation_mgmt',
          'prescription_mgmt',
          'treatment_mgmt',
          'doctor_mgmt',
          'internship_mgmt',
          'patient_mgmt',
          'patients_mgmt',
          'appointment_mgmt',
          'appointments_mgmt',
          'ai_event_poster_credits_10',
          'ai_poster_credits',
        ],
      },
      {
        id: 'a839c741-b4a1-4f2e-8db2-8f600afec2bb',
        name: 'Ultra Pro Plan',
        description:
          'For multi-branch dental practices & enterprise. 3 Branch Mgmt, Unlimited Appointments, Unlimited Patients Mgmt, Custom Clinic Website Feature, 15 AI Event Poster Credits, Staff Mgmt, Procedure Catalog Mgmt, WhatsApp SMS Integration, Invoice Mgmt, Finance Mgmt.',
        price_monthly: 4999.0,
        type: 'SOFTWARE',
        max_branches: 3,
        max_patients: null,
        max_appointments: null,
        is_active: true,
        allowed_features: [
          'dashboard_access',
          'branch_management',
          'finance_mgmt',
          'procedure_catalog',
          'whatsapp_sms',
          'invoice_mgmt',
          'billing_mgmt',
          'staff_mgmt',
          'unlimited_patients',
          'unlimited_appointments',
          'settings_access',
          'consultation_mgmt',
          'prescription_mgmt',
          'treatment_mgmt',
          'doctor_mgmt',
          'internship_mgmt',
          'patient_mgmt',
          'patients_mgmt',
          'appointment_mgmt',
          'appointments_mgmt',
          'website_feature',
          'website_builder',
          'ai_event_poster_credits_15',
          'ai_poster_credits',
        ],
      },
    ];

    try {
      // Deactivate obsolete plans: Digital Presence & Growth Plan
      await this.planModel.update(
        { is_active: false },
        {
          where: {
            name: {
              [Op.in]: ['Digital Presence', 'Growth Plan'],
            },
          },
        },
      );

      // Ensure Premium Growth remains active with updated reel-free description
      await this.planModel.update(
        {
          is_active: true,
          price_monthly: 9999.0,
          description:
            'DentCare360 Software, Website & Appointment Booking, Patient Review Automation, 20 Social Graphics, Google SEO, Monthly Analytics.',
        },
        {
          where: {
            name: 'Premium Growth',
          },
        },
      );
    } catch (err) {
      this.logger.warn('Could not update plans status: ' + err.message);
    }

    for (const planData of defaultPlans) {
      const existingPlan = await this.planModel.findByPk(planData.id);
      if (!existingPlan) {
        await this.planModel.create(planData as any);
        this.logger.log(`Seeded plan: ${planData.name}`);
      } else {
        await existingPlan.update(planData);
        this.logger.log(`Updated plan: ${planData.name}`);
      }
    }
  }

  async getPlans() {
    return this.planModel.findAll({
      where: { is_active: true },
      order: [['price_monthly', 'ASC']],
    });
  }

  async checkout(organizationId: string, planId: string) {
    const plan = await this.planModel.findByPk(planId);
    if (!plan) throw new NotFoundException('Plan not found');

    // Create a pending subscription in our DB if it doesn't exist
    let subscription = await this.subscriptionModel.findOne({
      where: {
        organization_id: organizationId,
        status: SubscriptionStatus.PENDING,
        plan_id: planId,
      },
    });

    if (!subscription) {
      subscription = await this.subscriptionModel.create({
        organization_id: organizationId,
        plan_id: planId,
        status: SubscriptionStatus.PENDING,
      });
    }

    if (!this.razorpay) {
      throw new InternalServerErrorException('Razorpay is not configured.');
    }

    try {
      // For simple SaaS, we can just create an order for the monthly price
      // If we wanted automated recurring, we'd use this.razorpay.subscriptions.create
      const options = {
        amount: Math.round(plan.price_monthly * 100), // paisa
        currency: 'INR',
        receipt: `rcpt_sub_${subscription.id.substring(0, 8)}`,
      };

      const order = await this.razorpay.orders.create(options);

      // Create pending payment record
      await this.paymentModel.create({
        subscription_id: subscription.id,
        amount: plan.price_monthly,
        currency: 'INR',
        razorpay_order_id: order.id,
        status: PaymentStatus.PENDING,
      });

      return {
        orderId: order.id,
        amount: options.amount,
        currency: options.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      this.logger.error(
        'Error creating Razorpay order for subscription',
        error,
      );
      throw new InternalServerErrorException('Failed to initiate checkout');
    }
  }

  async verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = payload.razorpay_order_id + '|' + payload.razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== payload.razorpay_signature) {
      throw new InternalServerErrorException('Invalid payment signature');
    }

    const payment = await this.paymentModel.findOne({
      where: { razorpay_order_id: payload.razorpay_order_id },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    payment.status = PaymentStatus.SUCCESS;
    payment.razorpay_payment_id = payload.razorpay_payment_id;
    payment.razorpay_signature = payload.razorpay_signature;
    payment.paid_at = new Date();
    await payment.save();

    const subscription = await this.subscriptionModel.findByPk(
      payment.subscription_id,
    );
    if (subscription) {
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.start_date = new Date();
      // Set end date to 1 month from now
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      subscription.end_date = endDate;
      await subscription.save();

      // Deactivate all other active subscriptions for this organization
      await this.subscriptionModel.update(
        { status: SubscriptionStatus.EXPIRED },
        {
          where: {
            organization_id: subscription.organization_id,
            status: SubscriptionStatus.ACTIVE,
            id: { [Op.ne]: subscription.id },
          },
        },
      );

      // Find the plan to update the users
      const plan = await this.planModel.findByPk(subscription.plan_id);
      if (plan) {
        // Update all users belonging to this organization to upgrade them
        await this.userModel.update(
          {
            plan: plan.name,
            planStatus: 'ACTIVE',
            planStartedAt: subscription.start_date,
            planExpiresAt: subscription.end_date,
            isTrial: false,
          },
          {
            where: { organization_id: subscription.organization_id },
          },
        );

        const adminUser = await this.userModel.findOne({
          where: {
            organization_id: subscription.organization_id,
            role: 'OWNER',
          },
        });

        if (adminUser && adminUser.email) {
          try {
            await this.emailService.sendPlanPurchaseEmail(
              adminUser.email,
              plan.name,
            );
          } catch (e) {
            this.logger.error('Failed to send plan purchase email to admin', e);
          }
        }
      }
    }

    return {
      success: true,
      message: 'Payment verified and subscription activated.',
    };
  }

  async getCurrentSubscription(organizationId: string, userId?: string) {
    if (userId) {
      const user = await this.userModel.findByPk(userId);
      if (
        user &&
        (user.plan === 'Premium Growth' || user.plan === 'PRACTICE_GROWTH') &&
        user.isTrial
      ) {
        const isExpired =
          user.planStatus === 'EXPIRED' ||
          !!(user.planExpiresAt && new Date() > new Date(user.planExpiresAt));

        const practiceGrowthPlan = await this.planModel.findOne({
          where: { name: 'Premium Growth' },
        });

        return {
          id: 'trial_subscription',
          organization_id: organizationId,
          plan_id: practiceGrowthPlan
            ? practiceGrowthPlan.id
            : 'premium_growth_id',
          status: isExpired
            ? SubscriptionStatus.EXPIRED
            : SubscriptionStatus.ACTIVE,
          start_date: user.planStartedAt,
          end_date: user.planExpiresAt,
          is_active: !isExpired,
          isTrial: true,
          plan: practiceGrowthPlan || {
            id: 'premium_growth_id',
            name: 'Premium Growth',
            price_monthly: 9999,
            type: 'BUNDLE',
            max_branches: null,
            max_patients: null,
            max_appointments: null,
            is_active: true,
          },
          plan_key: 'premium_growth',
        };
      }
    }

    return this.subscriptionModel.findOne({
      where: {
        organization_id: organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: [Plan],
      order: [['updated_at', 'DESC']],
    });
  }

  async checkFeatureLimits(
    organizationId: string,
    feature: 'max_branches' | 'max_patients' | 'max_appointments',
    currentCount: number,
    userId?: string,
  ) {
    const subscription = await this.getCurrentSubscription(
      organizationId,
      userId,
    );

    // Default fallback if no active subscription is found
    // If we want strict block, we throw. For now, let's assume they might be on a basic plan implicitly, or block them.
    // Let's block them if they don't have ANY subscription and are trying to exceed 0?
    // Let's assume a default free tier or trial if null, but they should have a trial.
    if (!subscription || !subscription.plan) {
      throw new ForbiddenException(
        'No active subscription found. Please subscribe to a plan to access this feature.',
      );
    }

    const limit = subscription.plan[feature];
    if (limit !== null && limit !== undefined && currentCount >= limit) {
      const featureName = feature.replace('max_', '');
      throw new ForbiddenException(
        `Subscription limit reached. Your plan allows up to ${limit} ${featureName}(s). Please upgrade to add more.`,
      );
    }
    return true;
  }

  async assignPlanToOrganization(organizationId: string, planId: string) {
    const plan = await this.planModel.findByPk(planId);
    if (!plan) throw new NotFoundException('Plan not found');

    // Expire current active subscription if any
    const currentSubscription = await this.subscriptionModel.findOne({
      where: {
        organization_id: organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (currentSubscription) {
      currentSubscription.status = SubscriptionStatus.EXPIRED;
      await currentSubscription.save();
    }

    const subscription = await this.subscriptionModel.create({
      organization_id: organizationId,
      plan_id: planId,
      status: SubscriptionStatus.ACTIVE,
      start_date: new Date(),
    });

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    subscription.end_date = endDate;
    await subscription.save();

    await this.userModel.update(
      {
        plan: plan.name,
        planStatus: 'ACTIVE',
        planStartedAt: subscription.start_date,
        planExpiresAt: subscription.end_date,
        isTrial: false,
      },
      {
        where: { organization_id: subscription.organization_id },
      },
    );

    return {
      success: true,
      message: 'Plan assigned successfully.',
      subscription,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiringSubscriptions() {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const startOfDay = new Date(threeDaysFromNow.setHours(0, 0, 0, 0));
    const endOfDay = new Date(threeDaysFromNow.setHours(23, 59, 59, 999));

    try {
      const expiringOwners = await this.userModel.findAll({
        where: {
          role: 'OWNER',
          planStatus: 'ACTIVE',
          planExpiresAt: {
            [Op.between]: [startOfDay, endOfDay],
          },
        },
      });

      for (const owner of expiringOwners) {
        if (owner.email && owner.plan && owner.planExpiresAt) {
          try {
            await this.emailService.sendPlanExpiryReminderEmail(
              owner.email,
              owner.plan,
              3,
              owner.planExpiresAt,
            );
          } catch (e) {
            this.logger.error(
              `Failed to send expiry reminder to ${owner.email}`,
              e,
            );
          }
        }
      }
    } catch (err) {
      this.logger.error('Error checking for expiring subscriptions', err);
    }
  }
}
