import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { WebsiteService } from '../website.service';

@Controller('website/public')
export class PublicWebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get()
  async getPublicWebsite(
    @Query('subdomain') subdomain: string,
    @Query('preview') preview?: string,
  ) {
    if (!subdomain) {
      throw new BadRequestException('Subdomain query parameter is required');
    }
    const isPreview = preview === 'true';
    return this.websiteService.getPublicWebsite(subdomain, isPreview);
  }
}
