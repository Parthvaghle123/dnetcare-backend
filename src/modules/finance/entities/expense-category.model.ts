import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';

@Table({ tableName: 'expense_categories', timestamps: true })
export class ExpenseCategory extends Model {
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

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_system: boolean;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @AllowNull(false)
  @Column(DataType.DATE)
  created_at: Date;

}
