import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateMedicalConditionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}
