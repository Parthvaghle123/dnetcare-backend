import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { ProcedureCategory } from './procedure-category.model';

@Table({ tableName: 'procedure_catalog', timestamps: true })
export class ProcedureCatalog extends Model {
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

  @ForeignKey(() => ProcedureCategory)
  @AllowNull(true)
  @Column(DataType.UUID)
  category_id: string;

  @BelongsTo(() => ProcedureCategory)
  category: ProcedureCategory;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  default_cost: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  duration_minutes: number;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @AllowNull(false)
  @Column(DataType.DATE)
  created_at: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  updated_at: Date;

}
