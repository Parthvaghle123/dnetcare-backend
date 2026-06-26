import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateCatalogStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}
