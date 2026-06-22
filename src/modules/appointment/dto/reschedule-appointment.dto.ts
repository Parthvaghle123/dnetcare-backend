import { IsDateString, IsOptional, IsInt, IsString, Min } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  scheduled_at: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  duration_minutes?: number;

  @IsOptional()
  @IsString()
  notes_for_doctor?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
