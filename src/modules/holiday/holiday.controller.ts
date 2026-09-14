import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('holidays')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Get()
  async getHolidays(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('branch_id') branchId?: string,
    @Req() req?: any,
  ) {
    // Optional organization context if token was provided in header
    let orgId = req?.user?.org_id || req?.user?.organization_id;
    if (!orgId && req?.headers?.authorization) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            orgId = payload?.org_id || payload?.organization_id;
          }
        } catch (e) {
          // ignore token decode failure
        }
      }
    }

    const holidays = await this.holidayService.findAll({
      year,
      month,
      branch_id: branchId,
      organization_id: orgId,
    });
    return {
      message: 'Holidays fetched successfully',
      data: holidays,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.MAIN_ADMIN)
  async createHoliday(
    @Body() dto: CreateHolidayDto,
    @CurrentUser() user: any,
  ) {
    const orgId = user?.org_id || user?.organization_id;
    const holiday = await this.holidayService.create(dto, orgId);
    return {
      message: 'Custom clinic holiday added successfully',
      data: holiday,
    };
  }

  @Post('toggle-cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.MAIN_ADMIN)
  async toggleCancelHoliday(
    @Body() dto: { id?: string; date?: string; branch_id?: string; is_cancelled?: boolean; name?: string; icon?: string },
    @CurrentUser() user: any,
  ) {
    const orgId = user?.org_id || user?.organization_id;
    const result = await this.holidayService.toggleCancelHoliday(dto, orgId);
    return {
      message: dto.is_cancelled === false ? 'Holiday re-enabled successfully' : 'Holiday cancelled — clinic is now open on this date',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.MAIN_ADMIN)
  async deleteHoliday(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const orgId = user?.org_id || user?.organization_id;
    await this.holidayService.remove(id, orgId);
    return {
      message: 'Holiday removed or cancelled successfully',
    };
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.MAIN_ADMIN)
  async seedHolidays() {
    const count = await this.holidayService.seed5Years();
    return {
      message: `5-year Indian government holidays seeded successfully (${count} new added)`,
    };
  }
}
