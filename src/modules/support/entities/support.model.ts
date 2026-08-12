import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { Organization } from '../../organization/entities/organization.model';

@Table({ tableName: 'support_tickets', timestamps: true })
export class SupportTicket extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  problem_name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  image_url: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  video_url: string;

  @AllowNull(false)
  @Default('OPEN')
  @Column(DataType.STRING)
  status: string; // 'OPEN', 'IN_PROGRESS', 'RESOLVED'

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  user_id: string;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Organization)
  @AllowNull(true)
  @Column(DataType.UUID)
  organization_id: string;

  @BelongsTo(() => Organization)
  organization: Organization;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
