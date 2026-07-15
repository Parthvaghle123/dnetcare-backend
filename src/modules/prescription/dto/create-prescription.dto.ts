import { IsUUID, IsOptional, IsString, IsArray, ValidateNested, Min, IsIn, MinLength, ArrayMinSize, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class MedicineDto {
  @IsString()
  @MinLength(2)
  medicine_name: string;

  @IsString()
  dosage: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(1)
  duration_days: number;

  @IsString()
  @IsIn(['After Meal', 'Before Meal', 'Sublingual', 'As Required'])
  timing: string;
}

export class CreatePrescriptionDto {
  @IsOptional()
  @IsUUID()
  consultation_id?: string;

  @IsOptional()
  @IsUUID()
  treatment_plan_id?: string;

  @IsOptional()
  @IsUUID()
  treatment_plan_phase_id?: string;

  @IsOptional()
  @IsString()
  advice?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one medicine is required.' })
  @ValidateNested({ each: true })
  @Type(() => MedicineDto)
  medicines: MedicineDto[];
}
