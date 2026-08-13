import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InternshipService } from './internship.service';
import { CreateInternshipBasicDto } from './dto/internship-inquiry-basic.dto';
import { UpdateInternshipProfessionalDto } from './dto/internship-inquiry-professional.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StatusCode } from '../../common/enums/status-code.enum';
import { InternshipInquiryStatus } from './enums/internship-status.enum';

@Controller('internships')
export class InternshipController {
  constructor(private readonly internshipService: InternshipService) {}

  @Get('apply/check')
  async checkByEmail(@Query('email') email: string) {
    return this.internshipService.checkByEmail(email);
  }

  @Post('apply/basic')
  async applyBasic(@Body() dto: CreateInternshipBasicDto) {
    return this.internshipService.applyBasicDetails(dto);
  }

  @Patch('apply/:id/professional')
  async applyProfessional(
    @Param('id') id: string,
    @Body() dto: UpdateInternshipProfessionalDto,
  ) {
    return this.internshipService.updateProfessionalDetails(id, dto);
  }

  @Patch('apply/:id/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(jpg|jpeg|png|webp)$/i;
        const originalName = file.originalname || '';

        if (!originalName.match(allowedExtensions)) {
          return cb(
            new HttpException(
              'Invalid file type. Only JPG, PNG, and WEBP images are allowed.',
              StatusCode.BAD_REQUEST,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit based on the UI
      },
    }),
  )
  async applyPhoto(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.internshipService.uploadPhotoAndComplete(id, file);
  }

  @Patch('apply/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: InternshipInquiryStatus,
  ) {
    if (!status || !Object.values(InternshipInquiryStatus).includes(status)) {
      throw new HttpException(
        'Invalid status provided.',
        StatusCode.BAD_REQUEST,
      );
    }
    return this.internshipService.updateStatus(id, status);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getInquiries(@Query() query: any) {
    const data = await this.internshipService.getInquiries(query);
    return { data };
  }
}
