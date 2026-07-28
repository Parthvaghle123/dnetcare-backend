import {
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
} from 'class-validator';

export class CreateExpenseDto {
  @IsUUID()
  branch_id: string;

  @IsUUID()
  category_id: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  expense_date?: string;

  @IsString()
  @IsIn(['CASH', 'ONLINE', 'CARD', 'UPI', 'CHEQUE'])
  payment_mode: string;

  @IsOptional()
  @IsString()
  vendor_name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
