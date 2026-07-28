import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  Matches,
  IsInt,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  last_name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/)
  mobile: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender: string;

  @IsUUID()
  @IsNotEmpty()
  registration_branch_id: string;

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
