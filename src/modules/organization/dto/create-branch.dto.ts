import { IsNotEmpty, IsOptional, IsString, MinLength, Length, Matches } from 'class-validator';

export class CreateBranchDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  city: string;

  @IsNotEmpty()
  @IsString()
  @Length(10, 10, { message: 'phone must be exactly 10 digits' })
  @Matches(/^[0-9]{10}$/, { message: 'phone must contain only numbers' })
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  @Length(10, 10, { message: 'whatsapp_number must be exactly 10 digits' })
  @Matches(/^[0-9]{10}$/, { message: 'whatsapp_number must contain only numbers' })
  whatsapp_number?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color_code must be a valid hex color code (e.g. #3B82F6)' })
  color_code: string;

  @IsOptional()
  @IsString()
  logo_url?: string;
}
