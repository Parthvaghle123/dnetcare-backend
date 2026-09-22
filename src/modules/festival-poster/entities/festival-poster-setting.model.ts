import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Index,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({ tableName: 'festival_poster_settings', timestamps: true })
export class FestivalPosterSetting extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  organization_id: string;

  @AllowNull(true)
  @Index
  @Column(DataType.UUID)
  branch_id: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  doctor_id: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  doctor_name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  doctor_photo_url: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  clinic_logo_url: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  custom_greeting: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  display_options: Record<string, any>;

  @AllowNull(true)
  @Column(DataType.JSONB)
  system_overrides: Record<string, any>;
}
