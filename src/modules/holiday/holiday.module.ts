import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Holiday } from './entities/holiday.model';
import { HolidayService } from './holiday.service';
import { HolidayController } from './holiday.controller';

@Module({
  imports: [SequelizeModule.forFeature([Holiday])],
  controllers: [HolidayController],
  providers: [HolidayService],
  exports: [HolidayService, SequelizeModule],
})
export class HolidayModule {}
