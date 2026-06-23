import { Controller, Get, Post, Put, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Post('prescriptions')
  async createPrescription(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: any) {
    const data = await this.prescriptionService.createPrescription(user, dto);
    return { message: 'Prescription created successfully.', data };
  }

  @Put('prescriptions/:id')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR)
  async updatePrescription(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePrescriptionDto, @CurrentUser() user: any) {
    const data = await this.prescriptionService.updatePrescription(id, user, dto);
    return { message: 'Prescription updated successfully.', data };
  }

  @Get('consultations/:id/prescription')
  async getPrescriptionByConsultationId(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.prescriptionService.getPrescriptionByConsultationId(user, id);
    return { message: 'Prescription fetched.', data };
  }

  @Get('prescriptions/:id')
  async getPrescriptionById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.prescriptionService.getPrescriptionById(id, user);
    return { message: 'Prescription fetched.', data };
  }
}
