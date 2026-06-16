import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';

@Table({ tableName: 'organizations', timestamps: true })
export class Organization extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  phone: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  logo_url: string;

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
