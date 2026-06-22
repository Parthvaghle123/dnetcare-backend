import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { Branch } from '../../organization/entities/branch.model';
import { Patient } from '../../patient/entities/patient.model';
import { User } from '../../auth/entities/user.model';
import { TreatmentPlan } from '../../treatment/entities/treatment-plan.model';
import { TreatmentPlanPhase } from '../../treatment/entities/treatment-plan-phase.model';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  NO_SHOW = 'NO_SHOW',
}

@Table({ tableName: 'appointments', timestamps: true })
export class Appointment extends Model {
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

  @ForeignKey(() => Patient)
  @AllowNull(false)
  @Column(DataType.UUID)
  patient_id: string;

  @BelongsTo(() => Patient)
  patient: Patient;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  doctor_id: string;

  @BelongsTo(() => User)
  doctor: User;

  @ForeignKey(() => TreatmentPlan)
  @AllowNull(true)
  @Column(DataType.UUID)
  treatment_plan_id: string;

  @BelongsTo(() => TreatmentPlan)
  treatment_plan: TreatmentPlan;

  @ForeignKey(() => TreatmentPlanPhase)
  @AllowNull(true)
  @Column(DataType.UUID)
  plan_phase_id: string;

  @BelongsTo(() => TreatmentPlanPhase)
  plan_phase: TreatmentPlanPhase;

  @AllowNull(false)
  @Column(DataType.DATE)
  scheduled_at: Date;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  duration_minutes: number;

  @AllowNull(false)
  @Column(DataType.ENUM('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'))
  status: AppointmentStatus;

  @AllowNull(true)
  @Column(DataType.TEXT)
  cancellation_reason: string;

  @ForeignKey(() => Appointment)
  @AllowNull(true)
  @Column(DataType.UUID)
  rescheduled_from_id: string;

  @BelongsTo(() => Appointment)
  rescheduled_from: Appointment;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes_for_doctor: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  reminder_sent_at: Date;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  created_by: string;

  @BelongsTo(() => User)
  created_by_relation: User;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
