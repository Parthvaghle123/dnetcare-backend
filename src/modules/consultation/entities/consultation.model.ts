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
import { Patient } from '../../patient/entities/patient.model';
import { User } from '../../auth/entities/user.model';
import { Appointment } from '../../appointment/entities/appointment.model';

export enum DentalChartType {
  ADULT = 'ADULT',
  PEDIATRIC = 'PEDIATRIC',
  MIXED = 'MIXED',
}

@Table({ tableName: 'consultations', timestamps: true })
export class Consultation extends Model {
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

  @ForeignKey(() => Appointment)
  @AllowNull(true)
  @Column(DataType.UUID)
  appointment_id: string;

  @BelongsTo(() => Appointment)
  appointment: Appointment;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  consultation_date: Date;

  @AllowNull(true)
  @Column(DataType.TEXT)
  chief_complaint: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  clinical_findings: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  diagnosis: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  advice: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes_upper: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes_lower: string;

  @AllowNull(true)
  @Column(DataType.ENUM('ADULT', 'PEDIATRIC', 'MIXED'))
  dental_chart_type: DentalChartType;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  follow_up_date: Date;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_completed: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
