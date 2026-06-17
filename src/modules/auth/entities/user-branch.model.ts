import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey , CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { User } from './user.model';
import { Branch } from '../../organization/entities/branch.model';

@Table({ tableName: 'user_branches', timestamps: true })
export class UserBranch extends Model {
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

  @ForeignKey(() => Branch)
  @AllowNull(false)
  @Column(DataType.UUID)
  branch_id: string;

  @BelongsTo(() => Branch)
  branch: Branch;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_primary: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
