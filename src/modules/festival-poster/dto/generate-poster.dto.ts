import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class GeneratePosterDto {
  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  holiday_id?: string;

  @IsString()
  @IsOptional()
  branch_id?: string;

  @IsString()
  @IsOptional()
  doctor_id?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  aspect_ratio?: string;

  @IsString()
  @IsOptional()
  custom_greeting?: string;

  @IsString()
  @IsOptional()
  custom_prompt_additions?: string;

  @IsObject()
  @IsOptional()
  display_options?: {
    showOrganizationLogo?: boolean;
    showOrganizationName?: boolean;
    showTagline?: boolean;
    showClinicName?: boolean;
    showBranchName?: boolean;
    showDoctor?: boolean;
    showQualification?: boolean;
    showSpecialization?: boolean;
    showRegistrationNumber?: boolean;
    showExperience?: boolean;
    showMobile?: boolean;
    showWhatsapp?: boolean;
    showEmail?: boolean;
    showWebsite?: boolean;
    showAddress?: boolean;
    showServices?: boolean;
    showDate?: boolean;
    showGreeting?: boolean;
  };
}
