import { IsString, IsOptional } from 'class-validator';

export class PosterContextQueryDto {
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
}
