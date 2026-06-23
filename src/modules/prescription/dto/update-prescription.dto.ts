import { IsOptional, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { MedicineDto } from './create-prescription.dto';

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsString()
  advice?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'If providing medicines, at least one is required.' })
  @ValidateNested({ each: true })
  @Type(() => MedicineDto)
  medicines?: MedicineDto[];
}
