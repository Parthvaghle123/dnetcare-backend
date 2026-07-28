import { IsString, IsOptional, Matches, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'First Name must be text' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'First Name must contain only alphabets',
  })
  first_name?: string;

  @IsOptional()
  @IsString({ message: 'Last Name must be text' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Last Name must contain only alphabets',
  })
  last_name?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be text' })
  @Matches(/^[0-9]+$/, { message: 'Phone must contain only numbers' })
  @Length(10, 10, { message: 'Phone must be exactly 10 digits' })
  phone?: string;
}
