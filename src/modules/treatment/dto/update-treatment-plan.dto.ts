import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateTreatmentPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}
