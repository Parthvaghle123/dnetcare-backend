import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
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
  async createPrescription(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.prescriptionService.createPrescription(user, dto);
    return { message: 'Prescription created successfully.', data };
  }

  @Get('prescriptions')
  async getPrescriptions(
    @Query('patient_id') patient_id: string,
    @Query('consultation_id') consultation_id: string,
    @Query('treatment_plan_phase_id') treatment_plan_phase_id: string,
    @CurrentUser() user: any,
  ) {
    const filters = { patient_id, consultation_id, treatment_plan_phase_id };
    const data = await this.prescriptionService.getPrescriptions(user, filters);
    return { message: 'Prescriptions fetched successfully.', data };
  }

  @Put('prescriptions/:id')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR)
  async updatePrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrescriptionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.prescriptionService.updatePrescription(
      id,
      user,
      dto,
    );
    return { message: 'Prescription updated successfully.', data };
  }

  @Delete('prescriptions/:id')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR)
  async deletePrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.prescriptionService.deletePrescription(id, user);
    return { message: 'Prescription deleted successfully.' };
  }

  @Get('consultations/:id/prescription')
  async getPrescriptionByConsultationId(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.prescriptionService.getPrescriptionByConsultationId(
      user,
      id,
    );
    return { message: 'Prescription fetched.', data };
  }

  @Get('treatment-plan-phases/:id/prescription')
  async getPrescriptionByPhaseId(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.prescriptionService.getPrescriptionByPhaseId(
      user,
      id,
    );
    return { message: 'Prescription fetched.', data };
  }

  @Get('prescriptions/:id')
  async getPrescriptionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.prescriptionService.getPrescriptionById(id, user);
    return { message: 'Prescription fetched.', data };
  }
}
