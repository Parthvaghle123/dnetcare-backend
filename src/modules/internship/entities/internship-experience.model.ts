import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { InternshipInquiry } from './internship-inquiry.model';

@Table({ tableName: 'internship_experiences', timestamps: true })
export class InternshipExperience extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => InternshipInquiry)
  @AllowNull(false)
  @Column(DataType.UUID)
  inquiry_id: string;

  @BelongsTo(() => InternshipInquiry)
  inquiry: InternshipInquiry;

  @AllowNull(false)
  @Column(DataType.STRING)
  company_name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  role: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  start_date: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  end_date: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;
}
