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

@Table({ tableName: 'festival_posters', timestamps: true })
export class FestivalPoster extends Model {
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
  holiday_id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  holiday_name: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  holiday_date: string;

  @AllowNull(true)
  @Column(DataType.STRING(10))
  icon: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  artwork_url: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  doctor_name: string;
}
