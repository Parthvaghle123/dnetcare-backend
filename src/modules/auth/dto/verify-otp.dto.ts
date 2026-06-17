import { IsEmail, IsNumber, Min, Max } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsNumber()
  @Min(100000, { message: 'OTP must be a 6-digit number' })
  @Max(999999, { message: 'OTP must be a 6-digit number' })
  otp: number;
}
