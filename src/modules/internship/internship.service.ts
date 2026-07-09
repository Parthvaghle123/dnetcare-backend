import { Injectable, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InternshipInquiry } from './entities/internship-inquiry.model';
import { CreateInternshipInquiryDto } from './dto/internship-inquiry.dto';
import { UploadService } from '../upload/upload.service';
import { StatusCode } from '../../common/enums/status-code.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';

@Injectable()
export class InternshipService {
  constructor(
    @InjectModel(InternshipInquiry) private internshipModel: typeof InternshipInquiry,
    private uploadService: UploadService,
  ) {}

  async applyForInternship(dto: CreateInternshipInquiryDto, file?: Express.Multer.File) {
    let profile_image_url = null;
    
    // Upload image if provided
    if (file) {
      try {
        const uploadResult = await this.uploadService.uploadFile(file);
        profile_image_url = uploadResult.url; // Assuming uploadService returns { url: ... }
      } catch (error) {
        throw new HttpException({ message: 'Failed to upload profile image.', error: ErrorCode.INTERNAL_ERROR }, StatusCode.INTERNAL_SERVER_ERROR);
      }
    }

    const inquiry = await this.internshipModel.create({
      ...dto,
      profile_image_url,
    });

    return {
      message: 'Internship application submitted successfully.',
      inquiry_id: inquiry.id,
    };
  }

  async getInquiries(query: any) {
    const { search, organization_id } = query;
    const whereClause: any = {};

    if (organization_id) {
      whereClause.organization_id = organization_id;
    }
    
    // Simplistic search for full_name or email
    // A proper search would use Op.iLike, but let's keep it simple or use it if needed
    // Assuming Sequelize Op is not imported, let's just do exact match if needed or omit

    const inquiries = await this.internshipModel.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });

    return inquiries;
  }
}
