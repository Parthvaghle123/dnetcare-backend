import {
  IsString,
  IsEnum,
  IsBoolean,
  Matches,
  IsOptional,
  IsUUID,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { DayOfWeek, Shift } from '../entities/doctor-schedule.model';

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
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'start_time must be in HH:MM format',
  })
  start_time?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'end_time must be in HH:MM format',
  })
  end_time?: string;

  @IsEnum(Shift)
  @IsOptional()
  shift?: Shift;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;
}
