import { Injectable, HttpException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InternshipInquiry } from './entities/internship-inquiry.model';
import { InternshipExperience } from './entities/internship-experience.model';
import { CreateInternshipBasicDto } from './dto/internship-inquiry-basic.dto';
import { UpdateInternshipProfessionalDto } from './dto/internship-inquiry-professional.dto';
import { UploadService } from '../upload/upload.service';
import { EmailService } from '../notification/email.service';
import { StatusCode } from '../../common/enums/status-code.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';

@Injectable()
export class InternshipService {
  constructor(
    @InjectModel(InternshipInquiry) private internshipModel: typeof InternshipInquiry,
    @InjectModel(InternshipExperience) private experienceModel: typeof InternshipExperience,
    private uploadService: UploadService,
    private emailService: EmailService,
  ) {}

  async applyBasicDetails(dto: CreateInternshipBasicDto) {
    const inquiry = await this.internshipModel.create({
      ...dto,
    });

    return {
      message: 'Basic details submitted successfully.',
      inquiry_id: inquiry.id,
    };
  }

  async updateProfessionalDetails(id: string, dto: UpdateInternshipProfessionalDto) {
    const inquiry = await this.internshipModel.findByPk(id);
    if (!inquiry) {
      throw new NotFoundException({ message: 'Internship inquiry not found.', error: ErrorCode.NOT_FOUND });
    }

    const { experiences, ...updateData } = dto;

    await inquiry.update({
      ...updateData,
    });

    // If experiences are provided, clear old ones and insert new ones
    if (experiences && experiences.length > 0) {
      await this.experienceModel.destroy({ where: { inquiry_id: id } });
      const experiencesToCreate = experiences.map(exp => ({
        ...exp,
        inquiry_id: id,
      }));
      await this.experienceModel.bulkCreate(experiencesToCreate);
    }

    return {
      message: 'Professional details updated successfully.',
      inquiry_id: inquiry.id,
    };
  }

  async uploadPhotoAndComplete(id: string, file?: Express.Multer.File) {
    const inquiry = await this.internshipModel.findByPk(id);
    if (!inquiry) {
      throw new NotFoundException({ message: 'Internship inquiry not found.', error: ErrorCode.NOT_FOUND });
    }

    if (!file) {
      throw new HttpException({ message: 'Profile photo is required.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
    }

    try {
      const uploadResult = await this.uploadService.uploadFile(file);
      await inquiry.update({ profile_image_url: uploadResult.url });
      
      // Trigger email confirmation asynchronously
      this.emailService.sendInternshipConfirmationEmail(inquiry.email, inquiry.full_name).catch(e => {
        console.error('Failed to send internship confirmation email:', e);
      });

      return {
        message: 'Internship application completed successfully.',
        inquiry_id: inquiry.id,
      };
    } catch (error) {
      throw new HttpException({ message: 'Failed to upload profile image.', error: ErrorCode.INTERNAL_ERROR }, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getInquiries(query: any) {
    const { search, organization_id } = query;
    const whereClause: any = {};

    if (organization_id) {
      whereClause.organization_id = organization_id;
    }

    const inquiries = await this.internshipModel.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });

    return inquiries;
  }
}
