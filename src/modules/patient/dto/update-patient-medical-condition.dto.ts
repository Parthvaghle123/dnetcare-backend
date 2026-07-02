import { IsString, IsOptional } from 'class-validator';

export class UpdatePatientMedicalConditionDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
