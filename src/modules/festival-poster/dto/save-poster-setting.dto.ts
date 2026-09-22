import { IsString, IsOptional, IsObject } from 'class-validator';

export class SavePosterSettingDto {
  @IsString()
  @IsOptional()
  branch_id?: string;

  @IsString()
  @IsOptional()
  doctor_id?: string;

  @IsString()
  @IsOptional()
  doctor_name?: string;

  @IsString()
  @IsOptional()
  doctor_photo_url?: string;

  @IsString()
  @IsOptional()
  clinic_logo_url?: string;

  @IsString()
  @IsOptional()
  custom_greeting?: string;

  @IsObject()
  @IsOptional()
  display_options?: Record<string, any>;

  @IsObject()
  @IsOptional()
  system_overrides?: Record<string, any>;
}
