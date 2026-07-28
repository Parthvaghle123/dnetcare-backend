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
import { User } from '../../auth/entities/user.model';
import { Branch } from '../../organization/entities/branch.model';

@Table({ tableName: 'doctor_leaves', timestamps: true })
export class DoctorLeave extends Model {
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
  @Column(DataType.DATEONLY)
  start_date: Date;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  end_date: Date;

  @AllowNull(false)
  @Column(DataType.FLOAT)
  total_days: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  is_half_day: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  reason: string;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  notify_patients: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  notification_sent_at: Date;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  created_by: string;

  @BelongsTo(() => User)
  created_by_relation: User;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
