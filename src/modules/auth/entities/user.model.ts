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
  HasMany,
  Unique,
} from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { UserBranch } from './user-branch.model';
import { Op } from 'sequelize';

export enum UserRole {
  MAIN_ADMIN = 'MAIN_ADMIN',
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

@Table({
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeDestroy: (instance: User) => {
      if (instance.email === 'dentcare360.official@gmail.com' || instance.role === UserRole.MAIN_ADMIN) {
        throw new Error('Deletion of default MAIN_ADMIN user is not allowed.');
      }
    },
    beforeUpdate: (instance: User) => {
      if (instance.email === 'dentcare360.official@gmail.com' || instance.role === UserRole.MAIN_ADMIN) {
        if (instance.changed('is_deleted') && instance.is_deleted === true) {
          throw new Error('Deactivation/soft-deletion of default MAIN_ADMIN user is not allowed.');
        }
        if (instance.changed('is_active') && instance.is_active === false) {
          throw new Error('Deactivation of default MAIN_ADMIN user is not allowed.');
        }
        if (instance.changed('role') && instance.role !== UserRole.MAIN_ADMIN) {
          throw new Error('Role of default MAIN_ADMIN user cannot be changed.');
        }
      }
    },
    beforeBulkDestroy: (options: any) => {
      if (options.where) {
        options.where = {
          [Op.and]: [
            options.where,
            {
              email: { [Op.ne]: 'dentcare360.official@gmail.com' },
              role: { [Op.ne]: 'MAIN_ADMIN' }
            }
          ]
        };
      } else {
        options.where = {
          email: { [Op.ne]: 'dentcare360.official@gmail.com' },
          role: { [Op.ne]: 'MAIN_ADMIN' }
        };
      }
    },
    beforeBulkUpdate: (options: any) => {
      if (options.attributes && (options.attributes.is_deleted === true || options.attributes.is_active === false || options.attributes.status === 'INACTIVE')) {
        if (options.where) {
          options.where = {
            [Op.and]: [
              options.where,
              {
                email: { [Op.ne]: 'dentcare360.official@gmail.com' },
                role: { [Op.ne]: 'MAIN_ADMIN' }
              }
            ]
          };
        } else {
          options.where = {
            email: { [Op.ne]: 'dentcare360.official@gmail.com' },
            role: { [Op.ne]: 'MAIN_ADMIN' }
          };
        }
      }
    }
  }
})
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Organization)
  @AllowNull(true)
  @Column(DataType.UUID)
  organization_id: string | null;

  @BelongsTo(() => Organization)
  organization: Organization;

  @AllowNull(false)
  @Column(DataType.STRING)
  first_name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  last_name: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  email: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  phone: string;

  @AllowNull(false)
  @Column(DataType.ENUM('MAIN_ADMIN', 'OWNER', 'BRANCH_ADMIN', 'DOCTOR', 'RECEPTIONIST'))
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

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  is_deleted: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  last_login_at: Date;

  @HasMany(() => UserBranch)
  user_branches: UserBranch[];

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
