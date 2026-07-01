import { IsEnum, IsNotEmpty } from 'class-validator';
import { TreatmentPlanStatus } from '../entities/treatment-plan.model';

export class UpdateTreatmentPlanStatusDto {
  @IsEnum(TreatmentPlanStatus)
  @IsNotEmpty()
  status: TreatmentPlanStatus;
}
