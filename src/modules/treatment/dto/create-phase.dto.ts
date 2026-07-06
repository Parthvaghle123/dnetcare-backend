import { IsString, IsOptional, IsUUID, IsNumber, Min, IsArray, ValidateNested, ArrayMinSize, IsBoolean } from 'class-validator';

export class CreatePhaseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  procedure_id?: string;

  @IsOptional()
  @IsString()
  tooth_numbers?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @IsOptional()
  @IsString()
  doctor_notes?: string;

  @IsOptional()
  @IsBoolean()
  separate_cost?: boolean;
}
