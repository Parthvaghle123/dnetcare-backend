import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';

export enum UserRole {
  OWNER = 'OWNER',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
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
  @Column(DataType.STRING)
  password: string;

  @AllowNull(false)
  @Column(DataType.ENUM('OWNER', 'BRANCH_ADMIN', 'DOCTOR', 'RECEPTIONIST'))
  role: UserRole;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  last_login_at: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  created_at: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  updated_at: Date;

}
