import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'medical_condition_masters', timestamps: true })
export class MedicalConditionMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

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
