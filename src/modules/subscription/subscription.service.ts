import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private razorpay: any;

  constructor(
    @InjectModel(Plan) private readonly planModel: typeof Plan,
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(SubscriptionPayment)
    private readonly paymentModel: typeof SubscriptionPayment,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  async getPlans() {
    return this.planModel.findAll({ where: { is_active: true } });
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
      if (user && user.plan === 'ULTRA_PRO' && user.isTrial) {
        const isExpired = user.planStatus === 'EXPIRED' || !!(
          user.planExpiresAt &&
          new Date() > new Date(user.planExpiresAt)
        );

        const ultraProPlan = await this.planModel.findOne({
          where: { name: 'Ultra Pro Plan' },
        });

        return {
          id: 'trial_subscription',
          organization_id: organizationId,
          plan_id: ultraProPlan ? ultraProPlan.id : 'ultra_pro_id',
          status: isExpired ? SubscriptionStatus.EXPIRED : SubscriptionStatus.ACTIVE,
          start_date: user.planStartedAt,
          end_date: user.planExpiresAt,
          is_active: !isExpired,
          isTrial: true,
          plan: ultraProPlan || {
            id: 'ultra_pro_id',
            name: 'Ultra Pro Plan',
            price_monthly: 3999,
            type: 'SOFTWARE',
            max_branches: 3,
            max_patients: null,
            max_appointments: null,
            is_active: true,
          },
          plan_key: 'ultra_pro',
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
}

