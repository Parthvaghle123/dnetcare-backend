import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { Branch } from '../../organization/entities/branch.model';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum Shift {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
}

@Table({ tableName: 'doctor_schedules', timestamps: true })
export class DoctorSchedule extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  doctor_id: string;

  @BelongsTo(() => User)
  doctor: User;

  @ForeignKey(() => Branch)
  @AllowNull(false)
  @Column(DataType.UUID)
  branch_id: string;

  @BelongsTo(() => Branch)
  branch: Branch;

  @AllowNull(false)
  @Column(DataType.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'))
  day_of_week: DayOfWeek;

  @AllowNull(false)
  @Column(DataType.TIME)
  start_time: string;

  @AllowNull(false)
  @Column(DataType.TIME)
  end_time: string;

  @AllowNull(false)
  @Column(DataType.ENUM('MORNING', 'EVENING'))
  shift: Shift;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_available: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
