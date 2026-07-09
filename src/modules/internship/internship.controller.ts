import { Controller, Post, Get, Patch, Body, Param, Query, UseInterceptors, UploadedFile, UseGuards, HttpException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InternshipService } from './internship.service';
import { CreateInternshipInquiryDto } from './dto/internship-inquiry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StatusCode } from '../../common/enums/status-code.enum';

@Controller('internships')
export class InternshipController {
  constructor(private readonly internshipService: InternshipService) {}

  @Post('apply')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, cb) => {
      const allowedExtensions = /\.(jpg|jpeg|png|webp)$/i;
      const originalName = file.originalname || '';
      
      if (!originalName.match(allowedExtensions)) {
        return cb(new HttpException('Invalid file type. Only JPG, PNG, and WEBP images are allowed.', StatusCode.BAD_REQUEST), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit based on the UI
    }
  }))
  async applyForInternship(
    @Body() dto: CreateInternshipInquiryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.internshipService.applyForInternship(dto, file);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getInquiries(@Query() query: any) {
    const data = await this.internshipService.getInquiries(query);
    return { data };
  }
}
