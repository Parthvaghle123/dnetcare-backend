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
import { User } from './user.model';

@Table({ tableName: 'refresh_tokens', timestamps: true })
export class RefreshToken extends Model {
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

  @AllowNull(false)
  @Column(DataType.STRING)
  token: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  expires_at: Date;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_revoked: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  ip_address: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  user_agent: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
