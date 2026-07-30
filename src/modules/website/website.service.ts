import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Op } from 'sequelize';
import { WebsiteConfig } from './entities/website-config.model';
import { Organization } from '../organization/entities/organization.model';
import { UpdateWebsiteDto } from './dto/update-website.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class WebsiteService {
  constructor(
    @InjectModel(WebsiteConfig)
    private readonly websiteConfigModel: typeof WebsiteConfig,
    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly uploadService: UploadService,
  ) {}

  async checkSlugAvailable(organizationId: string, slug: string): Promise<{ available: boolean }> {
    const existingOrg = await this.organizationModel.findOne({
      where: {
        subdomain: slug,
        id: { [Op.ne]: organizationId },
      },
    });
    return { available: !existingOrg };
  }

  async getMyWebsiteConfig(organizationId: string) {
    const org = await this.organizationModel.findByPk(organizationId);
    let config = await this.websiteConfigModel.findOne({
      where: { organization_id: organizationId },
    });

    if (!config) {
      config = await this.websiteConfigModel.create({
        organization_id: organizationId,
      });
    }

    const configJson = config.get({ plain: true }) as any;
    configJson.slug = org?.subdomain || '';
    return configJson;
  }

  async updateWebsiteConfig(
    organizationId: string,
    updateDto: UpdateWebsiteDto,
    files: Express.Multer.File[] = [],
  ) {
    const org = await this.organizationModel.findByPk(organizationId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    let slug = org.subdomain;

    if (updateDto.slug && updateDto.slug !== org.subdomain) {
      const isAvailable = await this.checkSlugAvailable(organizationId, updateDto.slug);
      if (!isAvailable.available) {
        throw new BadRequestException('subdomain is taken already');
      }
      slug = updateDto.slug;
      try {
        await org.update({ subdomain: slug });
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          throw new BadRequestException('subdomain is taken already');
        }
        throw error;
      }
    }

    // Helper to set nested value (e.g. 'gallery_section.images.0.url')
    const setNestedValue = (obj: any, path: string, value: any) => {
      const parts = path.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    };

    // Upload files and map to DTO
    if (files && files.length > 0) {
      for (const file of files) {
        // fieldname e.g., "gallery_section.image", extract first part as section name
        const sectionName = file.fieldname.split('.')[0] || 'general';
        const folder = `website/${slug || organizationId}/${sectionName}/assets`;
        
        const uploadResult = await this.uploadService.uploadFile(file, folder);
        
        // Put the URL in the dto using the fieldname as path
        setNestedValue(updateDto, file.fieldname, uploadResult.url);
      }
    }

    let config = await this.websiteConfigModel.findOne({
      where: { organization_id: organizationId },
    });

    if (!config) {
      config = await this.websiteConfigModel.create({
        organization_id: organizationId,
        ...updateDto,
      });
    } else {
      await config.update(updateDto);
    }

    // Invalidate cache when updated
    if (slug) {
      await this.cacheManager.del(`website_public_${slug}`);
      await this.cacheManager.del(`website_preview_${slug}`);
    }

    const configJson = config.get({ plain: true }) as any;
    configJson.slug = slug;
    return configJson;
  }

  async publishWebsite(organizationId: string) {
    const config = await this.updateWebsiteConfig(organizationId, {
      is_published: true,
    });
    return config;
  }

  async getPublicWebsite(subdomain: string, isPreview: boolean = false) {
    const cacheKey = isPreview ? `website_preview_${subdomain}` : `website_public_${subdomain}`;
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const includeOptions: any = {
      model: WebsiteConfig,
    };

    if (!isPreview) {
      includeOptions.where = { is_published: true };
    }

    const org = await this.organizationModel.findOne({
      where: { subdomain, is_active: true },
      include: [includeOptions],
    });

    if (!org || !org.websiteConfig) {
      throw new NotFoundException(
        isPreview ? 'Website not found' : 'Website not found or not published',
      );
    }

    const payload = {
      organization: {
        id: org.id,
        name: org.name,
        phone: org.phone,
        logo_url: org.logo_url,
      },
      config: org.websiteConfig,
    };

    // Cache for 5 minutes (300000 ms) for public, or 5 seconds (5000 ms) for preview
    const ttl = isPreview ? 5000 : 300000;
    await this.cacheManager.set(cacheKey, payload, ttl);

    return payload;
  }
}
