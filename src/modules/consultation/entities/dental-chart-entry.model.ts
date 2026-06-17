import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Consultation } from './consultation.model';
import { Patient } from '../../patient/entities/patient.model';

@Table({ tableName: 'dental_chart_entries', timestamps: true })
export class DentalChartEntry extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Consultation)
  @AllowNull(false)
  @Column(DataType.UUID)
  consultation_id: string;

  @BelongsTo(() => Consultation)
  consultation: Consultation;

  @ForeignKey(() => Patient)
  @AllowNull(false)
  @Column(DataType.UUID)
  patient_id: string;

  @BelongsTo(() => Patient)
  patient: Patient;

  @AllowNull(true)
  @Column(DataType.STRING)
  tooth_number: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  surface: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  condition: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;


  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
