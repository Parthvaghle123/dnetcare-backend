import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WebsiteService } from '../website.service';
import { UpdateWebsiteDto } from '../dto/update-website.dto';

@Controller('admin/website')
@UseGuards(JwtAuthGuard)
export class AdminWebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get()
  async getMyWebsiteConfig(@Request() req) {
    const organizationId = req.user.org_id;
    return this.websiteService.getMyWebsiteConfig(organizationId);
  }

  @Put()
  async updateWebsiteConfig(
    @Request() req,
    @Body() updateDto: UpdateWebsiteDto,
  ) {
    const organizationId = req.user.org_id;
    return this.websiteService.updateWebsiteConfig(organizationId, updateDto);
  }

  @Post('publish')
  async publishWebsite(@Request() req) {
    const organizationId = req.user.org_id;
    return this.websiteService.publishWebsite(organizationId);
  }
}
