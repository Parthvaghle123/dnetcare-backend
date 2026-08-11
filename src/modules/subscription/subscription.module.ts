import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Plan } from './entities/plan.model';
import { Subscription } from './entities/subscription.model';
import { SubscriptionPayment } from './entities/subscription-payment.model';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { User } from '../auth/entities/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Plan, Subscription, SubscriptionPayment, User]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
