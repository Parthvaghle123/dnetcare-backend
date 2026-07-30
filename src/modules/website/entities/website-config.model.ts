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
} from 'sequelize-typescript';
import { Organization } from '../../organization/entities/organization.model';

@Table({ tableName: 'website_configs', timestamps: true })
export class WebsiteConfig extends Model {
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

  @AllowNull(false)
  @Default('royal_obsidian')
  @Column(DataType.STRING)
  template_id: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  is_published: boolean;

  // JSONB Columns for dynamic template data
  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  branding: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  hero_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  stats_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  about_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  services_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  gallery_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  branches_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  doctors_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  contact_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  footer_section: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  seo_metadata: any;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  social_links: any;

  @CreatedAt
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at: Date;
}
