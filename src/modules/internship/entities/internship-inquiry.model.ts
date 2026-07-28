import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from 'sequelize-typescript';
import { InternshipExperience } from './internship-experience.model';
import { InternshipInquiryStatus } from '../enums/internship-status.enum';

@Table({ tableName: 'internship_inquiries', timestamps: true })
export class InternshipInquiry extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Default(InternshipInquiryStatus.ACTIVE)
  @Column(DataType.STRING)
  status: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  organization_id: string;

  @HasMany(() => InternshipExperience)
  experiences: InternshipExperience[];

  @AllowNull(false)
  @Column(DataType.STRING)
  full_name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  email: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  mobile_number: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  qualification: string;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  is_pursuing: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  pursuing_year: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  city: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  state: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  address: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  professional_summary: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  skills: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  cover_note: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  profile_image_url: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
