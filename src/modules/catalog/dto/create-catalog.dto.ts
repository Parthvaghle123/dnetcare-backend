import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateCatalogDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  default_cost: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  duration_minutes?: number;
}
