import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InternshipInquiry } from './entities/internship-inquiry.model';
import { InternshipExperience } from './entities/internship-experience.model';
import { InternshipController } from './internship.controller';
import { InternshipService } from './internship.service';
import { UploadModule } from '../upload/upload.module';
import { NotificationModule } from '../notification/notification.module';
import { InternshipCronService } from './internship-cron.service';

@Module({
  imports: [
    SequelizeModule.forFeature([InternshipInquiry, InternshipExperience]),
    UploadModule,
    NotificationModule
  ],
  controllers: [InternshipController],
  providers: [InternshipService, InternshipCronService],
})
export class InternshipModule {}
