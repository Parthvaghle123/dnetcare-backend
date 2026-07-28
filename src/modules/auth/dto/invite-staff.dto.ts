import {
  IsString,
  IsEmail,
  MinLength,
  IsIn,
  IsUUID,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class InviteStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  first_name: string;

  @IsString()
  @MinLength(2)
  last_name: string;

  @IsString()
  @IsIn([Role.BRANCH_ADMIN, Role.DOCTOR, Role.RECEPTIONIST])
  role: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  branch_ids: string[];

  @IsOptional()
  @IsUUID()
  primary_branch_id?: string;
}
