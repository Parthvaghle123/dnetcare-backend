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

export enum HolidayType {
  NATIONAL = 'NATIONAL',
  GAZETTED = 'GAZETTED',
  RESTRICTED = 'RESTRICTED',
  FESTIVAL = 'FESTIVAL',
  CLINIC = 'CLINIC',
}

@Table({ tableName: 'holidays', timestamps: true })
export class Holiday extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Index
  @Column(DataType.DATEONLY)
  date: string; // YYYY-MM-DD

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Default(HolidayType.GAZETTED)
  @Column(DataType.ENUM(...Object.values(HolidayType)))
  type: HolidayType;

  @AllowNull(true)
  @Column(DataType.STRING(10))
  icon: string; // e.g. 🇮🇳, 🪔, 🎨, 🌙

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  is_gazetted: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Index
  @Column(DataType.INTEGER)
  year: number; // e.g. 2024, 2025, 2026, 2027, 2028

  @AllowNull(true)
  @Column(DataType.UUID)
  organization_id: string; // null = universal Indian Government holiday; set = clinic custom holiday

  @AllowNull(true)
  @Column(DataType.UUID)
  branch_id: string; // null = all branches
}
