import { IsUUID, IsOptional, IsDateString, IsNumber, IsString, IsArray, ValidateNested, Min, IsEnum, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceLineItemDto } from './create-invoice.dto';


export class UpdateInvoiceDto {
  @IsOptional()
  @IsUUID()
  patient_id?: string;

  @IsOptional()
  @IsUUID()
  branch_id?: string;

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

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  line_items?: InvoiceLineItemDto[];

  @IsOptional()
  @IsString()
  status?: string;
}
