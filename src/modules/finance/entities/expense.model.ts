import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { Branch } from '../../organization/entities/branch.model';
import { ExpenseCategory } from './expense-category.model';
import { User } from '../../auth/entities/user.model';

export enum ExpensePaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

@Table({ tableName: 'expenses', timestamps: true })
export class Expense extends Model {
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

  @ForeignKey(() => ExpenseCategory)
  @AllowNull(false)
  @Column(DataType.UUID)
  category_id: string;

  @BelongsTo(() => ExpenseCategory)
  category: ExpenseCategory;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  amount: number;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  expense_date: Date;

  @AllowNull(false)
  @Column(DataType.ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER'))
  payment_mode: ExpensePaymentMode;

  @AllowNull(true)
  @Column(DataType.STRING)
  vendor_name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  receipt_url: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  added_by: string;

  @BelongsTo(() => User)
  added_by_relation: User;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
