import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreatePricingInquiryDto {
  @IsNotEmpty({ message: 'First name is required.' })
  @IsString({ message: 'First name must be a string.' })
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required.' })
  @IsString({ message: 'Last name must be a string.' })
  lastName: string;

  @IsNotEmpty({ message: 'Email address is required.' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @IsString({ message: 'Phone number must be a string.' })
  @Matches(/^\+?[1-9]\d{1,14}$|^[0-9]{10}$/, {
    message: 'Please provide a valid phone number.',
  })
  phone: string;
}
