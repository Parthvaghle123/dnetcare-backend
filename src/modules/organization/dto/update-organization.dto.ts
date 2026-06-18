import { IsOptional, IsString, MinLength, Length, Matches } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(10, 10, { message: 'phone must be exactly 10 digits' })
  @Matches(/^[0-9]{10}$/, { message: 'phone must contain only numbers' })
  phone?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;
}
