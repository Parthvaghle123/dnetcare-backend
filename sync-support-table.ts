import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupportTicket } from './src/modules/support/entities/support.model';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Syncing support_tickets table...');
  try {
    await SupportTicket.sync({ alter: true });
    console.log('support_tickets table synced successfully.');
  } catch (error) {
    console.error('Error syncing support_tickets table:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
