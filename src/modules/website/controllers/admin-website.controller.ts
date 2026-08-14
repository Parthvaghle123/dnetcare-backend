import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WebsiteService } from '../website.service';
import { UpdateWebsiteDto } from '../dto/update-website.dto';

@Controller('admin/website')
@UseGuards(JwtAuthGuard)
export class AdminWebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get('check-slug')
  async checkSlug(@Request() req, @Query('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Slug query parameter is required');
    }
    const organizationId = req.user.org_id;
    return this.websiteService.checkSlugAvailable(organizationId, slug);
  }

  @Get()
  async getMyWebsiteConfig(@Request() req) {
    const organizationId = req.user.org_id;
    return this.websiteService.getMyWebsiteConfig(organizationId);
  }

  @Put()
  @UseInterceptors(AnyFilesInterceptor())
  async updateWebsiteConfig(
    @Request() req,
    @Body() updateDto: UpdateWebsiteDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const organizationId = req.user.org_id;

    // Parse JSON strings in body if they exist (multipart/form-data converts objects to strings)
    const parsedDto = { ...updateDto };
    for (const key of Object.keys(parsedDto)) {
      if (
        typeof parsedDto[key] === 'string' &&
        (parsedDto[key].startsWith('{') || parsedDto[key].startsWith('['))
      ) {
        try {
          parsedDto[key] = JSON.parse(parsedDto[key]);
        } catch (e) {
          // ignore parsing error if it's just a regular string
        }
      }
    }

    return this.websiteService.updateWebsiteConfig(
      organizationId,
      parsedDto,
      files,
    );
  }

  @Post('publish')
  async publishWebsite(@Request() req) {
    const organizationId = req.user.org_id;
    return this.websiteService.publishWebsite(organizationId);
  }
}
