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
import { Patient } from '../../patient/entities/patient.model';
import { Appointment } from '../../appointment/entities/appointment.model';

export enum NotificationChannel {
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Table({ tableName: 'notification_logs', timestamps: true })
export class NotificationLog extends Model {
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

  @ForeignKey(() => Patient)
  @AllowNull(true)
  @Column(DataType.UUID)
  patient_id: string;

  @BelongsTo(() => Patient)
  patient: Patient;

  @ForeignKey(() => Appointment)
  @AllowNull(true)
  @Column(DataType.UUID)
  appointment_id: string;

  @BelongsTo(() => Appointment)
  appointment: Appointment;

  @AllowNull(false)
  @Column(DataType.ENUM('WHATSAPP', 'SMS', 'EMAIL'))
  channel: NotificationChannel;

  @AllowNull(true)
  @Column(DataType.STRING)
  recipient_number: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  message_body: string;

  @AllowNull(false)
  @Column(DataType.ENUM('PENDING', 'SENT', 'FAILED'))
  status: NotificationStatus;

  @AllowNull(true)
  @Column(DataType.DATE)
  sent_at: Date;

  @AllowNull(true)
  @Column(DataType.TEXT)
  failed_reason: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
