import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';

export enum UserRole {
  OWNER = 'OWNER',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Table({ tableName: 'users', timestamps: true })
export class User extends Model {
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

  @AllowNull(false)
  @Column(DataType.STRING)
  first_name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  last_name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  email: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  phone: string;

  @AllowNull(false)
  @Column(DataType.ENUM('OWNER', 'BRANCH_ADMIN', 'DOCTOR', 'RECEPTIONIST'))
  role: UserRole;

  @AllowNull(false)
  @Default(UserStatus.PENDING)
  @Column(DataType.ENUM('PENDING', 'ACTIVE', 'INACTIVE'))
  status: UserStatus;

  @AllowNull(true)
  @Column(DataType.STRING(6))
  otp_code: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  otp_expires_at: Date;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  otp_attempts: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  refresh_token_hash: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  refresh_token_expires_at: Date;

  @AllowNull(true)
  @Column(DataType.TEXT)
  invite_token: string;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  last_login_at: Date;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

}
