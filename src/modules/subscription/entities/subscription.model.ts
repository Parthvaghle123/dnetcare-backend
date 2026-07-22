import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';
import { Plan } from './plan.model';
import { SubscriptionPayment } from './subscription-payment.model';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

@Table({ tableName: 'subscriptions', timestamps: true })
export class Subscription extends Model {
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

  @ForeignKey(() => Plan)
  @AllowNull(false)
  @Column(DataType.UUID)
  plan_id: string;

  @BelongsTo(() => Plan)
  plan: Plan;

  @AllowNull(false)
  @Default(SubscriptionStatus.PENDING)
  @Column({
    type: DataType.ENUM(...Object.values(SubscriptionStatus)),
  })
  status: SubscriptionStatus;

  @AllowNull(true)
  @Column(DataType.DATE)
  start_date: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  end_date: Date;

  @AllowNull(true)
  @Column(DataType.STRING)
  razorpay_subscription_id: string;

  @HasMany(() => SubscriptionPayment)
  payments: SubscriptionPayment[];
}
