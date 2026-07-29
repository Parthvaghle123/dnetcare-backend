import {
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

const parseJsonIfNeeded = ({ value }: { value: any }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

export class UpdateWebsiteDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  template_id?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  is_published?: boolean;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  branding?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  hero_section?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  stats_section?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  about_section?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  services_section?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  gallery_section?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  doctors_section?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  contact_section?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  footer_section?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  seo_metadata?: Record<string, any>;

  @IsOptional()
  @Transform(parseJsonIfNeeded)
  @IsObject()
  social_links?: Record<string, any>;
}
