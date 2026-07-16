import { IsString, IsEmail, IsOptional, Length, IsNotEmpty, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Organization Name is required' })
  @IsString({ message: 'Organization Name must be text' })
  org_name: string;

  @IsNotEmpty({ message: 'First Name is required' })
  @IsString({ message: 'First Name must be text' })
  @Matches(/^[a-zA-Z\s]+$/, { message: 'First Name must contain only alphabets' })
  first_name: string;

  @IsNotEmpty({ message: 'Last Name is required' })
  @IsString({ message: 'Last Name must be text' })
  @Matches(/^[a-zA-Z\s]+$/, { message: 'Last Name must contain only alphabets' })
  last_name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsOptional()
  @IsString({ message: 'Phone must be text' })
  @Matches(/^[0-9]+$/, { message: 'Phone must contain only numbers' })
  @Length(10, 10, { message: 'Phone must be exactly 10 digits' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Branch Name must be text' })
  branch_name?: string;

  @IsOptional()
  @IsString({ message: 'Branch City must be text' })
  branch_city?: string;

  @IsOptional()
  @IsString({ message: 'Branch Phone must be text' })
  @Matches(/^[0-9]+$/, { message: 'Branch Phone must contain only numbers' })
  @Length(10, 10, { message: 'Branch Phone must be exactly 10 digits' })
  branch_phone?: string;

  @IsOptional()
  @IsString({ message: 'Branch Address must be text' })
  branch_address?: string;

  @IsOptional()
  @IsString({ message: 'Branch State must be text' })
  branch_state?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Branch start_time must be in HH:MM format' })
  branch_start_time?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Branch end_time must be in HH:MM format' })
  branch_end_time?: string;
}
