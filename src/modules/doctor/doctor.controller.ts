import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { CreateDoctorLeaveDto } from './dto/create-doctor-leave.dto';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // --- Profile ---

  @Post(':id/profile')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async createProfile(@Param('id', ParseUUIDPipe) doctorId: string, @Body() dto: CreateDoctorProfileDto, @CurrentUser() user: any) {
    const data = await this.doctorService.createProfile(user, doctorId, dto);
    return { message: 'Doctor profile created successfully.', data };
  }

  @Get(':id/profile')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  async getDoctorProfile(@Param('id', ParseUUIDPipe) doctorId: string, @CurrentUser() user: any) {
    const data = await this.doctorService.getDoctorProfile(user, doctorId);
    return { message: 'Doctor profile fetched.', data };
  }

  @Put(':id/profile')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR)
  async updateProfile(@Param('id', ParseUUIDPipe) doctorId: string, @Body() dto: UpdateDoctorProfileDto, @CurrentUser() user: any) {
    // A doctor can update their own profile
    if (user.role === Role.DOCTOR && user.id !== doctorId) {
      return { message: 'Forbidden' }; // Caught by verify in service anyway
    }
    const data = await this.doctorService.updateProfile(user, doctorId, dto);
    return { message: 'Doctor profile updated successfully.', data };
  }

  // --- Schedules ---

  @Get(':id/schedules')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  async getSchedules(
    @Param('id', ParseUUIDPipe) doctorId: string, 
    @Query('shift') shift: string,
    @CurrentUser() user: any
  ) {
    const data = await this.doctorService.getSchedules(user, doctorId, shift);
    return { message: 'Doctor schedules fetched.', data };
  }

  @Post(':id/schedules')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async addSchedule(@Param('id', ParseUUIDPipe) doctorId: string, @Body() dto: CreateDoctorScheduleDto, @CurrentUser() user: any) {
    const data = await this.doctorService.addSchedule(user, doctorId, dto);
    return { message: 'Schedule added successfully.', data };
  }

  @Put(':id/schedules')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async updateSchedule(@Param('id', ParseUUIDPipe) doctorId: string, @Body() dto: UpdateDoctorScheduleDto, @CurrentUser() user: any) {
    const data = await this.doctorService.updateSchedule(user, doctorId, dto);
    return { message: 'Schedule updated successfully.', data };
  }

  @Delete(':id/schedules/:scheduleId')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async removeSchedule(@Param('id', ParseUUIDPipe) doctorId: string, @Param('scheduleId', ParseUUIDPipe) scheduleId: string, @CurrentUser() user: any) {
    await this.doctorService.removeSchedule(user, doctorId, scheduleId);
    return { message: 'Schedule removed successfully.' };
  }

  // --- Leaves ---

  @Get(':id/leaves')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  async getLeaves(@Param('id', ParseUUIDPipe) doctorId: string, @CurrentUser() user: any) {
    const data = await this.doctorService.getLeaves(user, doctorId);
    return { message: 'Doctor leaves fetched.', data };
  }

  @Post(':id/leaves')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR)
  async addLeave(@Param('id', ParseUUIDPipe) doctorId: string, @Body() dto: CreateDoctorLeaveDto, @CurrentUser() user: any) {
    const data = await this.doctorService.addLeave(user, doctorId, dto);
    return { message: 'Doctor leave logged successfully.', data };
  }

  @Delete(':id/leaves/:leaveId')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR)
  async cancelLeave(@Param('id', ParseUUIDPipe) doctorId: string, @Param('leaveId', ParseUUIDPipe) leaveId: string, @CurrentUser() user: any) {
    await this.doctorService.cancelLeave(user, doctorId, leaveId);
    return { message: 'Doctor leave cancelled successfully.' };
  }
}
