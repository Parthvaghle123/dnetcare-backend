import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FileType {
  XRAY = 'XRAY',
  INTRAORAL_PHOTO = 'INTRAORAL_PHOTO',
  LAB_REPORT = 'LAB_REPORT',
  OTHER = 'OTHER',
}

export class ConsultationDocumentDto {
  @IsString()
  file_url: string;

  @IsString()
  file_key: string;

  @IsString()
  file_name: string;

  @IsEnum(FileType)
  file_type: FileType;
}

export class BulkConsultationDocumentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConsultationDocumentDto)
  documents: ConsultationDocumentDto[];
}
