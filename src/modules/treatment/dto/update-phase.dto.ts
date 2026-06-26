import { IsString, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  procedure_id?: string;

  @IsOptional()
  @IsString()
  tooth_numbers?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  doctor_notes?: string;
}
