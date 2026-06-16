import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Patient } from './patient.model';
import { MedicalConditionMaster } from './medical-condition-master.model';
import { User } from '../../auth/entities/user.model';

@Table({ tableName: 'patient_medical_conditions', timestamps: true })
export class PatientMedicalCondition extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Patient)
  @AllowNull(false)
  @Column(DataType.UUID)
  patient_id: string;

  @BelongsTo(() => Patient)
  patient: Patient;

  @ForeignKey(() => MedicalConditionMaster)
  @AllowNull(false)
  @Column(DataType.UUID)
  condition_id: string;

  @BelongsTo(() => MedicalConditionMaster)
  condition: MedicalConditionMaster;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  recorded_by: string;

  @BelongsTo(() => User)
  recorded_by_relation: User;

  @AllowNull(false)
  @Column(DataType.DATE)
  created_at: Date;

}
