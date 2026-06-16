import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Organization } from './organization.model';

@Table({ tableName: 'branches', timestamps: true })
export class Branch extends Model {
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

  @AllowNull(true)
  @Column(DataType.TEXT)
  address: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  city: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  state: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  pincode: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  phone: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  whatsapp_number: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  color_code: string;

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
