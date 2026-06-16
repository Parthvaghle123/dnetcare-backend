import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Appointment } from './appointment.model';
import { User } from '../../auth/entities/user.model';

@Table({ tableName: 'appointment_status_history', timestamps: true })
export class AppointmentStatusHistory extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Appointment)
  @AllowNull(false)
  @Column(DataType.UUID)
  appointment_id: string;

  @BelongsTo(() => Appointment)
  appointment: Appointment;

  @AllowNull(true)
  @Column(DataType.STRING)
  previous_status: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  new_status: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  changed_by: string;

  @BelongsTo(() => User)
  changed_by_relation: User;

  @AllowNull(true)
  @Column(DataType.TEXT)
  reason: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  created_at: Date;

}
