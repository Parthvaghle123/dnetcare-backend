import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  BelongsTo,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { Branch } from '../../organization/entities/branch.model';
import { Consultation } from '../../consultation/entities/consultation.model';
import { Patient } from '../../patient/entities/patient.model';
import { User } from '../../auth/entities/user.model';

export enum TreatmentPlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

@Table({ tableName: 'treatment_plans', timestamps: true })
export class TreatmentPlan extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column(DataType.UUID)
  organization_id: string;

  @BelongsTo(() => Organization)
  organization: Organization;

  @ForeignKey(() => Branch)
  @AllowNull(false)
  @Column(DataType.UUID)
  branch_id: string;

  @BelongsTo(() => Branch)
  branch: Branch;

  @ForeignKey(() => Consultation)
  @AllowNull(true)
  @Column(DataType.UUID)
  consultation_id: string;

  @BelongsTo(() => Consultation)
  consultation: Consultation;

  @ForeignKey(() => Patient)
  @AllowNull(false)
  @Column(DataType.UUID)
  patient_id: string;

  @BelongsTo(() => Patient)
  patient: Patient;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  created_by: string;

  @BelongsTo(() => User)
  created_by_relation: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  title: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  total_cost: number;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  discount: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  final_cost: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  total_phases: number;

  @Default(TreatmentPlanStatus.ACTIVE)
  @Column(DataType.ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'))
  status: TreatmentPlanStatus;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
