import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { Branch } from '../../organization/entities/branch.model';
import { Patient } from '../../patient/entities/patient.model';
import { Invoice } from './invoice.model';
import { User } from '../../auth/entities/user.model';

export enum PaymentMode {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
  CARD = 'CARD',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE',
}

@Table({ tableName: 'payments', timestamps: true })
export class Payment extends Model {
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

  @ForeignKey(() => Invoice)
  @AllowNull(false)
  @Column(DataType.UUID)
  invoice_id: string;

  @BelongsTo(() => Invoice)
  invoice: Invoice;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  amount: number;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  payment_date: Date;

  @AllowNull(false)
  @Column(DataType.ENUM('CASH', 'ONLINE', 'CARD', 'UPI', 'CHEQUE'))
  payment_mode: PaymentMode;

  @AllowNull(true)
  @Column(DataType.STRING)
  payment_reference: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  received_by: string;

  @BelongsTo(() => User)
  received_by_relation: User;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
