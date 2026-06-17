import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';

@Table({ tableName: 'doctor_profiles', timestamps: true })
export class DoctorProfile extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  user_id: string;

  @BelongsTo(() => User)
  user: User;

  @AllowNull(true)
  @Column(DataType.STRING)
  registration_number: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  specialization: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  qualification: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  signature_url: string;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  default_consultation_fee: number;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
