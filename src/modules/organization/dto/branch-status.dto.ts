import { IsBoolean, IsNotEmpty } from 'class-validator';

export class BranchStatusDto {
  @IsNotEmpty()
  @IsBoolean()
  is_active: boolean;
}
