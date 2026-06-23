import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Prescription } from './prescription.model';

@Table({ tableName: 'prescription_medicines', timestamps: true })
export class PrescriptionMedicine extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Prescription)
  @AllowNull(false)
  @Column(DataType.UUID)
  prescription_id: string;

  @BelongsTo(() => Prescription)
  prescription: Prescription;

  @AllowNull(false)
  @Column(DataType.STRING)
  medicine_name: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  dosage: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  quantity: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  timing: string;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  duration_days: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  sort_order: number;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;


  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
