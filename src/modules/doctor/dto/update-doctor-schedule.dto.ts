import { IsString, IsEnum, IsNumber, IsBoolean, Matches, IsOptional, IsUUID, IsArray, IsNotEmpty, Min, Max } from 'class-validator';
import { DayOfWeek } from '../entities/doctor-schedule.model';

export class UpdateDoctorScheduleDto {
  @IsUUID()
  @IsOptional()
  branch_id?: string;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @IsNotEmpty()
  day_of_week: DayOfWeek[];

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'start_time must be in HH:MM format' })
  start_time?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'end_time must be in HH:MM format' })
  end_time?: string;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @Max(120)
  slot_duration_minutes?: number;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;
}
