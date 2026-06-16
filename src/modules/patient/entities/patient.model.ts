import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { Branch } from '../../organization/entities/branch.model';
import { User } from '../../auth/entities/user.model';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Table({ tableName: 'patients', timestamps: true })
export class Patient extends Model {
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

  @ForeignKey(() => Branch)
  @AllowNull(false)
  @Column(DataType.UUID)
  branch_id: string;

  @BelongsTo(() => Branch)
  branch: Branch;

  @AllowNull(false)
  @Column(DataType.STRING)
  file_number: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  first_name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  last_name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  mobile: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  alternate_mobile: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  email: string;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  date_of_birth: Date;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  age: number;

  @AllowNull(true)
  @Column(DataType.ENUM('MALE', 'FEMALE', 'OTHER'))
  gender: Gender;

  @AllowNull(true)
  @Column(DataType.TEXT)
  address: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  city: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  pincode: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  group_tag: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  total_phases: number;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  created_by: string;

  @BelongsTo(() => User)
  created_by_relation: User;

  @AllowNull(false)
  @Column(DataType.DATE)
  created_at: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  updated_at: Date;

}
