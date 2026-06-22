import { IsString, IsOptional, IsUUID, IsNumber, Min, IsArray, ValidateNested, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePhaseDto } from './create-phase.dto';

export class CreateTreatmentPlanDto {
  @IsUUID()
  patient_id: string;

  @IsUUID()
  branch_id: string;

  @IsUUID()
  consultation_id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  total_phases?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePhaseDto)
  phases: CreatePhaseDto[];
}
