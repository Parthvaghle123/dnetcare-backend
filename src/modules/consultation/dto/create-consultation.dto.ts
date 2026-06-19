import { IsString, IsUUID, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { DentalChartType } from '../entities/consultation.model';

export class CreateConsultationDto {
  @IsUUID()
  patient_id: string;

  @IsUUID()
  branch_id: string;

  @IsUUID()
  doctor_id: string;

  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @IsDateString()
  consultation_date: string;

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
}
