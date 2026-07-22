import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey, CreatedAt, UpdatedAt, HasMany } from 'sequelize-typescript';
import { Subscription } from '../../subscription/entities/subscription.model';

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
}
