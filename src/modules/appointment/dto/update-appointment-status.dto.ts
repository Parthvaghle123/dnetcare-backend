import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum UpdateAppointmentStatusEnum {
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED'
}

export class UpdateAppointmentStatusDto {
  @IsEnum(UpdateAppointmentStatusEnum)
  status: UpdateAppointmentStatusEnum;

  @ValidateIf(o => o.status === UpdateAppointmentStatusEnum.CANCELLED)
  @IsString()
  cancellation_reason?: string;
}
