import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateMedicalConditionStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}
