import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateStaffStatusDto } from './dto/update-staff-status.dto';
import { InviteStaffDto } from '../auth/dto/invite-staff.dto';
import { AcceptInviteDto } from '../auth/dto/accept-invite.dto';
import { StatusCode } from '../../common/enums/status-code.enum';

@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly authService: AuthService,
  ) {}

  @Get('referral-search')
  @UseGuards(JwtAuthGuard)
  async searchReferrals(
    @CurrentUser() user: any,
    @Query('search') search?: string,
  ) {
    const data = await this.staffService.searchReferrals(user, search || '');
    return { message: 'Referral suggestions fetched.', data };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getStaffList(
    @CurrentUser() user: any,
    @Query('branch_id') branch_id?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('is_active') is_active?: string,
    @Query('is_deleted') is_deleted?: string,
    @Query('is_pending') is_pending?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      branch_id,
      role,
      status,
      is_active,
      is_deleted,
      is_pending,
      search,
      page,
      limit,
    };
    const result = await this.staffService.getStaffList(user, filters);
    return {
      message: 'Staff list fetched successfully.',
      data: result.records,
      meta: result.meta,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getStaffById(@Param('id') staffId: string, @CurrentUser() user: any) {
    const data = await this.staffService.getStaffById(user, staffId);
    return { message: 'Staff details fetched.', data };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async updateStaff(
    @Param('id') staffId: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.staffService.updateStaff(user, staffId, dto);
    return { message: 'Staff updated successfully.', data };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async updateStaffStatus(
    @Param('id') staffId: string,
    @Body() dto: UpdateStaffStatusDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.staffService.updateStaffStatus(user, staffId, dto);
    return { message: `Staff status updated successfully.`, data };
  }

  @Get(':id/branches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getStaffBranches(
    @Param('id') staffId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.staffService.getStaffBranches(user, staffId);
    return { message: 'Staff branches fetched.', data };
  }

  @Post(':id/branches/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async assignStaffToBranch(
    @Param('id') staffId: string,
    @Param('branchId') branchId: string,
    @CurrentUser() user: any,
  ) {
    await this.staffService.assignStaffToBranch(user, staffId, branchId);
    return { message: 'Staff assigned to branch successfully.' };
  }

  @Delete(':id/branches/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async removeStaffFromBranch(
    @Param('id') staffId: string,
    @Param('branchId') branchId: string,
    @CurrentUser() user: any,
  ) {
    await this.staffService.removeStaffFromBranch(user, staffId, branchId);
    return { message: 'Staff removed from branch successfully.' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async deleteStaff(@Param('id') staffId: string, @CurrentUser() user: any) {
    await this.staffService.deleteStaff(user, staffId);
    return { message: 'Staff deleted successfully.' };
  }

  @Post('invite-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async inviteStaff(@Body() dto: InviteStaffDto, @CurrentUser() user: any) {
    const data = await this.authService.inviteStaff(dto, user);
    return {
      message: `Invitation sent to ${dto.email}`,
      data,
    };
  }

  @Post('accept-invite')
  @HttpCode(StatusCode.OK)
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    const data = await this.authService.acceptInvite(dto);
    return {
      message: 'Account activated. OTP sent to your email to complete login.',
      data,
    };
  }

  @Get('invite/:token')
  @HttpCode(StatusCode.OK)
  async getInviteDetails(@Param('token') token: string) {
    const data = await this.authService.getInviteDetails(token);
    return {
      message: 'Invite details fetched successfully.',
      data,
    };
  }
}
