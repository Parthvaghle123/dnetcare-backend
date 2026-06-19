import { IsString, IsNotEmpty, IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateDoctorLeaveDto {
  @IsUUID()
  @IsNotEmpty()
  branch_id: string;

  @IsDateString()
  @IsNotEmpty()
  leave_date: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsNotEmpty()
  notify_patients: boolean;
}
