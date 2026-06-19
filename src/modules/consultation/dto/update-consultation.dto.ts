import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { DentalChartType } from '../entities/consultation.model';

export class UpdateConsultationDto {
  @IsOptional()
  @IsDateString()
  consultation_date?: string;

  @IsOptional()
  @IsEnum(DentalChartType)
  dental_chart_type?: DentalChartType;

  @IsOptional()
  @IsString()
  chief_complaint?: string;

  @IsOptional()
  @IsString()
  clinical_findings?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  advice?: string;

  @IsOptional()
  @IsString()
  notes_upper?: string;

  @IsOptional()
  @IsString()
  notes_lower?: string;

  @IsOptional()
  @IsDateString()
  follow_up_date?: string;

  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;
}
