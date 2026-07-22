import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Plan } from './src/modules/subscription/entities/plan.model';
import { Subscription } from './src/modules/subscription/entities/subscription.model';
import { SubscriptionPayment } from './src/modules/subscription/entities/subscription-payment.model';
import { Organization } from './src/modules/organization/entities/organization.model';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Syncing subscription tables...');
  await Plan.sync({ alter: true });
  await Subscription.sync({ alter: true });
  await SubscriptionPayment.sync({ alter: true });
  // Ensure the foreign key exists by syncing Organization, though it's already created.
  
  console.log('Tables synced.');
  await app.close();
}

bootstrap();
