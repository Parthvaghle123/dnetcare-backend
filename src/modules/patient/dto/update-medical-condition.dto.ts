import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateMedicalConditionDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
