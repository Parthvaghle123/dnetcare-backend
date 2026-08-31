import {
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  IsUUID,
} from 'class-validator';
import { PaymentMode } from '../entities/payment.model';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @IsEnum(PaymentMode)
  payment_mode: PaymentMode;

  @IsOptional()
  @IsString()
  payment_reference?: string;

  @IsOptional()
  @IsUUID()
  branch_id?: string;
}
