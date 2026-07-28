import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsInt,
  IsString,
  Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  patient_id: string;

  @IsUUID()
  branch_id: string;

  @IsUUID()
  doctor_id: string;

  @IsDateString()
  scheduled_at: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  duration_minutes?: number;

  @IsOptional()
  @IsUUID()
  treatment_plan_id?: string;

  @IsOptional()
  @IsUUID()
  treatment_plan_phase_id?: string;

  @IsOptional()
  @IsString()
  notes_for_doctor?: string;
}
