import { IsString, IsEmail, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateInternshipInquiryDto {
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsNotEmpty()
  @IsString()
  full_name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  mobile_number: string;

  @IsNotEmpty()
  @IsString()
  qualification: string;

  @IsOptional()
  @IsString()
  description?: string;
}
