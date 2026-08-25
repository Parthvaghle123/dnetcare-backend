import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EmailService } from '../../notification/email.service';
import { CreatePricingInquiryDto } from '../dto/create-pricing-inquiry.dto';

@Controller('pricing-inquiry')
export class PricingInquiryController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  async createPricingInquiry(@Body() dto: CreatePricingInquiryDto) {
    try {
      await this.emailService.sendPricingInquiryEmail(
        dto.firstName,
        dto.lastName,
        dto.email,
        dto.phone,
        new Date(),
      );
      return {
        success: true,
        message: 'Pricing inquiry submitted successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to submit pricing inquiry. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
