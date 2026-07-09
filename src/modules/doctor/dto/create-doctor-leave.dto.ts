import { IsString, IsNotEmpty, IsBoolean, IsDateString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateDoctorLeaveDto {
  @IsUUID()
  @IsNotEmpty()
  branch_id: string;

  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @IsNumber()
  @IsNotEmpty()
  total_days: number;

  @IsBoolean()
  @IsOptional()
  is_half_day?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsNotEmpty()
  notify_patients: boolean;
}
