import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  Matches,
} from 'class-validator';
import { HolidayType } from '../entities/holiday.model';

export class CreateHolidayDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(HolidayType)
  @IsOptional()
  type?: HolidayType;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  is_gazetted?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  branch_id?: string;
}
