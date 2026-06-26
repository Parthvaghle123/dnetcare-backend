import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdatePatientStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}
