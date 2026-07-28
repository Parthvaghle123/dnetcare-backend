import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  BelongsTo,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { Consultation } from './consultation.model';
import { Patient } from '../../patient/entities/patient.model';
import { User } from '../../auth/entities/user.model';

@Table({ tableName: 'consultation_documents', timestamps: true })
export class ConsultationDocument extends Model {
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

  @AllowNull(false)
  @Column(DataType.TEXT)
  file_url: string;

  @AllowNull(true)
  @Column(DataType.ENUM('XRAY', 'INTRAORAL_PHOTO', 'LAB_REPORT', 'OTHER'))
  file_type: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  file_key: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  file_name: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  uploaded_by: string;

  @BelongsTo(() => User)
  uploaded_by_relation: User;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
