import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Consultation } from '../../consultation/entities/consultation.model';
import { Patient } from '../../patient/entities/patient.model';
import { User } from '../../auth/entities/user.model';

@Table({ tableName: 'prescriptions', timestamps: true })
export class Prescription extends Model {
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

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  doctor_id: string;

  @BelongsTo(() => User)
  doctor: User;

  @AllowNull(true)
  @Column(DataType.TEXT)
  advice: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  created_at: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  updated_at: Date;

}
