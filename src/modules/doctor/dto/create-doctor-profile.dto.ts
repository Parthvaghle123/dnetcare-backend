import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateDoctorProfileDto {
  @IsString()
  @IsOptional()
  registration_number?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsString()
  @IsOptional()
  signature_url?: string;

  @IsNumber()
  @IsOptional()
  default_consultation_fee?: number;
}
