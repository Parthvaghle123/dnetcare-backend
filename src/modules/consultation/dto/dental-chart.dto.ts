import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ToothCondition {
  CARIES = 'CARIES',
  FRACTURE = 'FRACTURE',
  MOBILITY = 'MOBILITY',
  ROOT_STUMP = 'ROOT_STUMP',
  MISSING_TOOTH = 'MISSING_TOOTH',
  IMPACTED = 'IMPACTED',
  SUPRA_ERUPTED = 'SUPRA_ERUPTED',
  PERIAPICAL_ABSCESS = 'PERIAPICAL_ABSCESS',
  RCT_DONE = 'RCT_DONE',
  CROWN = 'CROWN',
  BRIDGE = 'BRIDGE',
  IMPLANT = 'IMPLANT',
}

export class DentalChartDto {
  @IsString()
  tooth_number: string;

  @IsString()
  condition: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkDentalChartDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DentalChartDto)
  entries: DentalChartDto[];
}
