import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StatusCode } from '../../common/enums/status-code.enum';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'dental-software'): Promise<any> {
    if (!file) {
      throw new HttpException('No file provided.', StatusCode.BAD_REQUEST);
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('[uploadFile] Cloudinary upload error:', error);
            return reject(
              new HttpException(
                'File upload failed. Please try again.',
                StatusCode.INTERNAL_SERVER_ERROR,
              ),
            );
          }
          if (!result) {
            return reject(
              new HttpException(
                'File upload failed. Please try again.',
                StatusCode.INTERNAL_SERVER_ERROR,
              ),
            );
          }
          resolve({
            public_id: result.public_id,
            file_key: result.public_id,
            url: result.secure_url,
            file_name: file.originalname,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(fileKey: string): Promise<any> {
    if (!fileKey) {
      throw new HttpException('No file key provided.', StatusCode.BAD_REQUEST);
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(fileKey, (error, result) => {
        if (error) {
          this.logger.error('[deleteFile] Cloudinary delete error:', error);
          return reject(
            new HttpException(
              'File deletion failed.',
              StatusCode.INTERNAL_SERVER_ERROR,
            ),
          );
        }
        resolve(result);
      });
    });
  }
}
