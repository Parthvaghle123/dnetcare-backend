import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { Branch } from '../../organization/entities/branch.model';
import { Patient } from '../../patient/entities/patient.model';
import { Consultation } from '../../consultation/entities/consultation.model';
import { TreatmentPlan } from '../../treatment/entities/treatment-plan.model';
import { User } from '../../auth/entities/user.model';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Table({ tableName: 'invoices', timestamps: true })
export class Invoice extends Model {
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

  @ForeignKey(() => Consultation)
  @AllowNull(true)
  @Column(DataType.UUID)
  consultation_id: string;

  @BelongsTo(() => Consultation)
  consultation: Consultation;

  @ForeignKey(() => TreatmentPlan)
  @AllowNull(true)
  @Column(DataType.UUID)
  treatment_plan_id: string;

  @BelongsTo(() => TreatmentPlan)
  treatment_plan: TreatmentPlan;

  @AllowNull(false)
  @Column(DataType.STRING)
  invoice_number: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  invoice_date: Date;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  consultation_fee: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  procedure_amount: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  other_amount: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  subtotal: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  discount: number;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  gst_percentage: number;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  gst_amount: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  total: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  paid_amount: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  pending_amount: number;

  @AllowNull(false)
  @Column(DataType.ENUM('DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'))
  status: InvoiceStatus;

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
