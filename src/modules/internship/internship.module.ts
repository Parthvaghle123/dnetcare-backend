import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InternshipInquiry } from './entities/internship-inquiry.model';
import { InternshipController } from './internship.controller';
import { InternshipService } from './internship.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    SequelizeModule.forFeature([InternshipInquiry]),
    UploadModule
  ],
  controllers: [InternshipController],
  providers: [InternshipService],
})
export class InternshipModule {}
