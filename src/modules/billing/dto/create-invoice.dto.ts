import { IsUUID, IsOptional, IsDateString, IsNumber, IsString, IsArray, ValidateNested, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsUUID()
  procedure_id?: string;

  @IsOptional()
  @IsUUID()
  treatment_plan_phase_id?: string;

  @IsOptional()
  @IsString()
  tooth_numbers?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0)
  unit_cost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateInvoiceDto {
  @IsUUID()
  patient_id: string;

  @IsUUID()
  branch_id: string;

  @IsOptional()
  @IsUUID()
  consultation_id?: string;

  @IsOptional()
  @IsUUID()
  treatment_plan_id?: string;

  @IsOptional()
  @IsDateString()
  invoice_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultation_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  other_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  gst_percentage?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  line_items: InvoiceLineItemDto[];
}
