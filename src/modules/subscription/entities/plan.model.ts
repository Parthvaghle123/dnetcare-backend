import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  HasMany,
} from 'sequelize-typescript';
import { Subscription } from './subscription.model';

export enum PlanType {
  SOFTWARE = 'SOFTWARE',
  MARKETING = 'MARKETING',
  BUNDLE = 'BUNDLE',
}

@Table({ tableName: 'plans', timestamps: true })
export class Plan extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  price_monthly: number;

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(...Object.values(PlanType)),
  })
  type: PlanType;

  // Feature limits
  @AllowNull(true)
  @Column(DataType.INTEGER)
  max_branches: number;

  @AllowNull(true) // null means unlimited
  @Column(DataType.INTEGER)
  max_patients: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  max_appointments: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  razorpay_plan_id: string; // If using Razorpay Subscriptions

  @AllowNull(true)
  @Column(DataType.JSONB)
  allowed_features: string[];

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @HasMany(() => Subscription)
  subscriptions: Subscription[];
}
