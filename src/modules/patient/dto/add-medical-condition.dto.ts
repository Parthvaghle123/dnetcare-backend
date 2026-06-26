import { IsUUID, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AddMedicalConditionDto {
  @IsUUID()
  @IsNotEmpty()
  condition_id: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
