import {
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
} from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expense_date?: string;

  @IsOptional()
  @IsString()
  @IsIn(['CASH', 'ONLINE', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER'])
  payment_mode?: string;

  @IsOptional()
  @IsString()
  vendor_name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
