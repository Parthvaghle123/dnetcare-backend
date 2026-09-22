import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FestivalPosterService } from './festival-poster.service';
import { GeneratePosterDto } from './dto/generate-poster.dto';
import { PosterContextQueryDto } from './dto/poster-context-query.dto';
import { SavePosterSettingDto } from './dto/save-poster-setting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('festival-posters')
export class FestivalPosterController {
  constructor(private readonly festivalPosterService: FestivalPosterService) {}

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getPosterSettings(
    @Query('branch_id') branchId: string,
    @CurrentUser() user: any,
  ) {
    const settings = await this.festivalPosterService.getPosterSettings(user, branchId);
    return {
      message: 'Festival poster settings retrieved successfully',
      data: settings,
    };
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard)
  async savePosterSettings(
    @Body() dto: SavePosterSettingDto,
    @CurrentUser() user: any,
  ) {
    const saved = await this.festivalPosterService.savePosterSettings(user, dto);
    return {
      message: 'Festival poster settings saved successfully',
      data: saved,
    };
  }

  @Get('templates')
  getTemplates() {
    const templates = this.festivalPosterService.getFestivalTemplates();
    return {
      message: 'Festival templates retrieved successfully',
      data: templates,
    };
  }

  @Get('upcoming')
  @UseGuards(JwtAuthGuard)
  async getUpcomingFestivals(
    @Query('branch_id') branchId: string,
    @Query('year') year: string,
    @CurrentUser() user: any,
  ) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const holidays = await this.festivalPosterService.getUpcomingFestivalHolidays(
      user,
      branchId,
      parsedYear,
    );
    return {
      message: 'Upcoming festival holidays fetched successfully',
      data: holidays,
    };
  }

  @Get('context')
  @UseGuards(JwtAuthGuard)
  async getPosterContext(
    @Query() query: PosterContextQueryDto,
    @CurrentUser() user: any,
  ) {
    const context = await this.festivalPosterService.resolvePosterContext(
      user,
      query,
    );
    return {
      message: 'Poster context resolved successfully',
      data: context,
    };
  }

  @Post('generate-art')
  @UseGuards(JwtAuthGuard)
  async generateArtwork(
    @Body() dto: GeneratePosterDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.festivalPosterService.generateArtwork(user, dto);
    return {
      message: 'Poster artwork generated successfully',
      data: result,
    };
  }

  @Get('gallery')
  @UseGuards(JwtAuthGuard)
  async getGallery(@CurrentUser() user: any) {
    const gallery = await this.festivalPosterService.getGeneratedGallery(user);
    return {
      message: 'Generated festival posters fetched successfully',
      data: gallery,
    };
  }

  @Post('save')
  @UseGuards(JwtAuthGuard)
  async savePoster(
    @Body() posterData: any,
    @CurrentUser() user: any,
  ) {
    const saved = await this.festivalPosterService.recordGeneratedPoster(user, posterData);
    return {
      message: 'Poster saved to gallery successfully',
      data: saved,
    };
  }
}
