import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StatusCode } from '../../common/enums/status-code.enum';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('signature')
  getSignature() {
    return this.uploadService.getSignature();
  }

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedExtensions =
          /\.(jpg|jpeg|png|gif|webp|bmp|tiff|pdf|doc|docx|dcm|stl|ply|obj|zip|rar|7z|mp4|webm|mov|mkv)$/i;
        const originalName = file.originalname || '';

        if (!originalName.match(allowedExtensions)) {
          return cb(
            new HttpException(
              'Invalid file type. Only Images, Videos, PDFs, Documents, Scans (DCM, STL), and Archives are allowed.',
              StatusCode.BAD_REQUEST,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('File is required.', StatusCode.BAD_REQUEST);
    }
    const data = await this.uploadService.uploadFile(file);
    return { message: 'File uploaded successfully.', data };
  }
}
