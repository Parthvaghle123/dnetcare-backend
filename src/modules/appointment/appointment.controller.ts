import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get('today')
  async getTodaySchedule(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.appointmentService.getTodaySchedule(user, query);
    return { message: 'Today schedule fetched.', data };
  }

  @Get('slots')
  async getAvailableSlots(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.appointmentService.getAvailableSlots(user, query);
    return { message: 'Available slots fetched.', data };
  }

  @Get()
  async getAppointments(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.appointmentService.getAppointments(user, query);
    return { message: 'Appointments fetched successfully.', data };
  }

  @Post()
  async createAppointment(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.appointmentService.createAppointment(user, dto);
    return { message: 'Appointment booked successfully.', data };
  }

  @Get(':id')
  async getAppointmentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.appointmentService.getAppointmentById(user, id);
    return { message: 'Appointment details fetched.', data };
  }

  @Patch(':id/status')
  async updateAppointmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.appointmentService.updateAppointmentStatus(
      user,
      id,
      dto,
    );
    return { message: result.message, data: result.data };
  }

  @Patch(':id/reschedule')
  async rescheduleAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.appointmentService.rescheduleAppointment(
      user,
      id,
      dto,
    );
    return { message: 'Appointment rescheduled successfully.', data };
  }
}
