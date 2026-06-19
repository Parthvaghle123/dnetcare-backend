import { Controller, Get, Put, Patch, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateStaffStatusDto } from './dto/update-staff-status.dto';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getStaffList(
    @CurrentUser() user: any, 
    @Query('branch_id') branch_id?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('is_active') is_active?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filters = { branch_id, role, status, is_active, search, page, limit };
    const result = await this.staffService.getStaffList(user, filters);
    return {
      message: 'Staff list fetched successfully.',
      data: result.records,
      meta: result.meta
    };
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getStaffById(@Param('id') staffId: string, @CurrentUser() user: any) {
    const data = await this.staffService.getStaffById(user, staffId);
    return { message: 'Staff details fetched.', data };
  }

  @Put(':id')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async updateStaff(@Param('id') staffId: string, @Body() dto: UpdateStaffDto, @CurrentUser() user: any) {
    const data = await this.staffService.updateStaff(user, staffId, dto);
    return { message: 'Staff updated successfully.', data };
  }

  @Patch(':id/status')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async updateStaffStatus(@Param('id') staffId: string, @Body() dto: UpdateStaffStatusDto, @CurrentUser() user: any) {
    const data = await this.staffService.updateStaffStatus(user, staffId, dto);
    return { message: `Staff status updated successfully.`, data };
  }

  @Get(':id/branches')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getStaffBranches(@Param('id') staffId: string, @CurrentUser() user: any) {
    const data = await this.staffService.getStaffBranches(user, staffId);
    return { message: 'Staff branches fetched.', data };
  }

  @Post(':id/branches/:branchId')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async assignStaffToBranch(
    @Param('id') staffId: string, 
    @Param('branchId') branchId: string, 
    @CurrentUser() user: any
  ) {
    await this.staffService.assignStaffToBranch(user, staffId, branchId);
    return { message: 'Staff assigned to branch successfully.' };
  }

  @Delete(':id/branches/:branchId')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async removeStaffFromBranch(
    @Param('id') staffId: string, 
    @Param('branchId') branchId: string, 
    @CurrentUser() user: any
  ) {
    await this.staffService.removeStaffFromBranch(user, staffId, branchId);
    return { message: 'Staff removed from branch successfully.' };
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  async deleteStaff(@Param('id') staffId: string, @CurrentUser() user: any) {
    await this.staffService.deleteStaff(user, staffId);
    return { message: 'Staff deleted successfully.' };
  }
}
