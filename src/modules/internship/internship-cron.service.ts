import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import dayjs from 'dayjs';
import { InternshipInquiry } from './entities/internship-inquiry.model';
import { InternshipInquiryStatus } from './enums/internship-status.enum';

@Injectable()
export class InternshipCronService {
  private readonly logger = new Logger(InternshipCronService.name);

  constructor(
    @InjectModel(InternshipInquiry) private internshipModel: typeof InternshipInquiry,
  ) {}

  // Run once a day at midnight in production. Changed to EVERY_MINUTE for testing.
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    // Calculate the threshold time (1 month ago)
    const thresholdDate = dayjs().subtract(1, 'month').toDate();

    const [updatedCount] = await this.internshipModel.update(
      { status: InternshipInquiryStatus.DISABLED },
      {
        where: {
          status: InternshipInquiryStatus.ACTIVE,
          updated_at: {
            [Op.lt]: thresholdDate,
          },
        },
      },
    );

    if (updatedCount > 0) {
      this.logger.log(`Auto-disabled ${updatedCount} inactive CVs.`);
    }
  }
}
