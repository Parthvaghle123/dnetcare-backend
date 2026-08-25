import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MAIN_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  @Get('users')
  async getAllUsers() {
    const data = await this.adminService.getAllUsers();
    return { success: true, data };
  }

  @Put('users/:id/status')
  async toggleUserStatus(
    @Param('id') userId: string,
    @Body('is_active') isActive: boolean,
  ) {
    const data = await this.adminService.toggleUserStatus(userId, isActive);
    return { success: true, data };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') userId: string) {
    const data = await this.adminService.deleteUser(userId);
    return { success: true, data };
  }

  // ==========================================
  // PLAN MANAGEMENT
  // ==========================================

  @Get('plans')
  async getPlans() {
    const data = await this.adminService.getPlans();
    return { success: true, data };
  }

  @Post('plans')
  async createPlan(@Body() dto: any) {
    const data = await this.adminService.createPlan(dto);
    return { success: true, data };
  }

  @Put('plans/:id')
  async updatePlan(@Param('id') planId: string, @Body() dto: any) {
    const data = await this.adminService.updatePlan(planId, dto);
    return { success: true, data };
  }

  @Delete('plans/:id')
  async deactivatePlan(@Param('id') planId: string) {
    const data = await this.adminService.deactivatePlan(planId);
    return { success: true, data };
  }

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  @Get('dashboard')
  async getDashboardStats(
    @Query('appointmentPeriod') appointmentPeriod = 'week',
    @Query('treatmentPeriod') treatmentPeriod = 'month',
    @Query('financePeriod') financePeriod = 'month',
    @Query('user_id') userId?: string,
  ) {
    const data = await this.adminService.getDashboardStats(
      appointmentPeriod,
      treatmentPeriod,
      financePeriod,
      userId,
    );
    return { success: true, data };
  }

  @Get('dashboard-stats')
  async getDashboardStatsPreload(
    @Query('appointmentPeriod') appointmentPeriod = 'week',
    @Query('treatmentPeriod') treatmentPeriod = 'month',
    @Query('financePeriod') financePeriod = 'month',
    @Query('user_id') userId?: string,
  ) {
    const data = await this.adminService.getDashboardStats(
      appointmentPeriod,
      treatmentPeriod,
      financePeriod,
      userId,
    );
    return { success: true, data };
  }
}
