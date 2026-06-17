import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'medicine_masters', timestamps: true })
export class MedicineMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  generic_name: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  type: string;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_system: boolean;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;


  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
