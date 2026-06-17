import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { TreatmentPlan } from './treatment-plan.model';
import { Appointment } from '../../appointment/entities/appointment.model';
import { ProcedureCatalog } from '../../catalog/entities/procedure-catalog.model';
import { User } from '../../auth/entities/user.model';

export enum TreatmentPlanPhaseStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Table({ tableName: 'treatment_plan_phases', timestamps: true })
export class TreatmentPlanPhase extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => TreatmentPlan)
  @AllowNull(false)
  @Column(DataType.UUID)
  treatment_plan_id: string;

  @BelongsTo(() => TreatmentPlan)
  treatment_plan: TreatmentPlan;

  @ForeignKey(() => Appointment)
  @AllowNull(true)
  @Column(DataType.UUID)
  appointment_id: string;

  @BelongsTo(() => Appointment)
  appointment: Appointment;

  @ForeignKey(() => ProcedureCatalog)
  @AllowNull(true)
  @Column(DataType.UUID)
  procedure_id: string;

  @BelongsTo(() => ProcedureCatalog)
  procedure: ProcedureCatalog;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  phase_number: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  title: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  tooth_numbers: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  quantity: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  cost: number;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  discount: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  doctor_notes: string;

  @AllowNull(false)
  @Column(DataType.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
  status: TreatmentPlanPhaseStatus;

  @AllowNull(true)
  @Column(DataType.DATE)
  completed_at: Date;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  completed_by: string;

  @BelongsTo(() => User)
  completed_by_relation: User;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
