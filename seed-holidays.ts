import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Holiday } from './src/modules/holiday/entities/holiday.model';
import { HolidayService } from './src/modules/holiday/holiday.service';

async function bootstrap() {
  console.log('🚀 Initializing NestJS application context for Holiday seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    console.log('📦 Syncing holidays table in database (alter: true)...');
    await Holiday.sync({ alter: true });
    console.log('✅ Holidays table schema synced.');

    console.log('🧹 Purging outdated pre-2026 universal holidays from database...');
    const { Op } = await import('sequelize');
    const purged = await Holiday.destroy({
      where: {
        organization_id: null,
        year: { [Op.lt]: 2026 },
      },
    });
    if (purged > 0) {
      console.log(`🗑️ Removed ${purged} old universal holidays (years prior to 2026).`);
    }

    console.log('🌱 Seeding 5 years (2026–2030) of official Indian holidays...');
    const holidayService = app.get(HolidayService);
    const result = await holidayService.seed5Years();
    console.log('🎉 Seeding complete result:', result);

    const count = await Holiday.count();
    console.log(`📊 Total holidays currently in database: ${count}`);
  } catch (error) {
    console.error('❌ Error during holiday seeding:', error);
  } finally {
    await app.close();
    console.log('👋 Application context closed.');
  }
}

bootstrap();
