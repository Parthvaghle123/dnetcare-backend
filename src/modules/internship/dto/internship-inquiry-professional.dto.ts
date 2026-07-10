import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ExperienceDto {
  @IsNotEmpty()
  @IsString()
  company_name: string;

  @IsNotEmpty()
  @IsString()
  role: string;

  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateInternshipProfessionalDto {
  @IsOptional()
  @IsString()
  professional_summary?: string;

  @IsNotEmpty()
  @IsString()
  qualification: string;

  @IsOptional()
  @IsBoolean()
  is_pursuing?: boolean;

  @IsOptional()
  @IsString()
  pursuing_year?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsString()
  cover_note?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];
}
