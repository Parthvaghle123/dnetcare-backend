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
} from 'sequelize-typescript';
import { Subscription } from './subscription.model';

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

@Table({ tableName: 'subscription_payments', timestamps: true })
export class SubscriptionPayment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Subscription)
  @AllowNull(false)
  @Column(DataType.UUID)
  subscription_id: string;

  @BelongsTo(() => Subscription)
  subscription: Subscription;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  amount: number;

  @AllowNull(false)
  @Default('INR')
  @Column(DataType.STRING)
  currency: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  razorpay_order_id: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  razorpay_payment_id: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  razorpay_signature: string;

  @AllowNull(false)
  @Default(PaymentStatus.PENDING)
  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
  })
  status: PaymentStatus;

  @AllowNull(true)
  @Column(DataType.DATE)
  paid_at: Date;
}
