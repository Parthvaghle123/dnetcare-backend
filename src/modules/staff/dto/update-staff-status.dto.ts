import { IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../../auth/entities/user.model';

export class UpdateStaffStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;

  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;
}
