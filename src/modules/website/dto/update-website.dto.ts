import {
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class UpdateWebsiteDto {
  @IsOptional()
  @IsString()
  template_id?: string;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @IsOptional()
  @IsObject()
  branding?: Record<string, any>;

  @IsOptional()
  @IsObject()
  hero_section?: Record<string, any>;

  @IsOptional()
  @IsObject()
  stats_section?: Record<string, any>;

  @IsOptional()
  @IsObject()
  about_section?: Record<string, any>;

  @IsOptional()
  @IsObject()
  services_section?: Record<string, any>;

  @IsOptional()
  @IsObject()
  gallery_section?: Record<string, any>;

  @IsOptional()
  @IsObject()
  doctors_section?: Record<string, any>;

  @IsOptional()
  @IsObject()
  contact_section?: Record<string, any>;

  @IsOptional()
  @IsObject()
  footer_section?: Record<string, any>;

  @IsOptional()
  @IsObject()
  seo_metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  social_links?: Record<string, any>;
}
