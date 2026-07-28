import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { WebsiteConfig } from './entities/website-config.model';
import { Organization } from '../organization/entities/organization.model';
import { UpdateWebsiteDto } from './dto/update-website.dto';

@Injectable()
export class WebsiteService {
  constructor(
    @InjectModel(WebsiteConfig)
    private readonly websiteConfigModel: typeof WebsiteConfig,
    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getMyWebsiteConfig(organizationId: string) {
    let config = await this.websiteConfigModel.findOne({
      where: { organization_id: organizationId },
    });

    if (!config) {
      config = await this.websiteConfigModel.create({
        organization_id: organizationId,
      });
    }

    return config;
  }

  async updateWebsiteConfig(
    organizationId: string,
    updateDto: UpdateWebsiteDto,
  ) {
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
    const org = await this.organizationModel.findByPk(organizationId);
    if (org && org.subdomain) {
      await this.cacheManager.del(`website_public_${org.subdomain}`);
    }

    return config;
  }

  async publishWebsite(organizationId: string) {
    const config = await this.updateWebsiteConfig(organizationId, {
      is_published: true,
    });
    return config;
  }

  async getPublicWebsite(subdomain: string) {
    const cacheKey = `website_public_${subdomain}`;
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const org = await this.organizationModel.findOne({
      where: { subdomain, is_active: true },
      include: [
        {
          model: WebsiteConfig,
          where: { is_published: true },
        },
      ],
    });

    if (!org || !org.websiteConfig) {
      throw new NotFoundException('Website not found or not published');
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

    // Cache for 5 minutes (300000 ms in cache-manager v5, or seconds depending on version, usually ms)
    await this.cacheManager.set(cacheKey, payload, 300000);

    return payload;
  }
}
