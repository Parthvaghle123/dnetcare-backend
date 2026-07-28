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
  HasOne,
} from 'sequelize-typescript';
import { Subscription } from '../../subscription/entities/subscription.model';
import { WebsiteConfig } from '../../website/entities/website-config.model';

@Table({ tableName: 'organizations', timestamps: true })
export class Organization extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  phone: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  logo_url: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING, unique: true })
  subdomain: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING, unique: true })
  custom_domain: string;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;

  @HasMany(() => Subscription)
  subscriptions: Subscription[];

  @HasOne(() => WebsiteConfig)
  websiteConfig: WebsiteConfig;
}
