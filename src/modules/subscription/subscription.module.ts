import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Plan } from './entities/plan.model';
import { Subscription } from './entities/subscription.model';
import { SubscriptionPayment } from './entities/subscription-payment.model';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Plan, Subscription, SubscriptionPayment]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
