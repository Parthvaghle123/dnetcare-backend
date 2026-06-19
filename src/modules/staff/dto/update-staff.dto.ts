import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  first_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  last_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;
}
