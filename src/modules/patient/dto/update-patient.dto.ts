import { IsString, IsOptional, IsEnum, IsUUID, MinLength, Matches, IsInt } from 'class-validator';

export class UpdatePatientDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  first_name?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  last_name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{10}$/)
  mobile?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsUUID()
  @IsOptional()
  registration_branch_id?: string;

  @IsString()
  @IsOptional()
  date_of_birth?: string;

  @IsInt()
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  referred_by?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
