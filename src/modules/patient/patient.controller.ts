import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientStatusDto } from './dto/update-patient-status.dto';
import { AddMedicalConditionDto } from './dto/add-medical-condition.dto';
import { UpdatePatientMedicalConditionDto } from './dto/update-patient-medical-condition.dto';
import { BillingService } from '../billing/billing.service';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientController {
  constructor(
    private readonly patientService: PatientService,
    private readonly billingService: BillingService,
  ) {}

  // ===== STATIC ROUTES FIRST =====

  @Post()
  async createPatient(@Body() dto: CreatePatientDto, @CurrentUser() user: any) {
    const data = await this.patientService.createPatient(user, dto);
    return { message: 'Patient registered successfully.', data };
  }

  @Get()
  async getPatients(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.patientService.getPatients(user, query);
    return { message: 'Patients fetched successfully.', data };
  }

  // ===== DYNAMIC :id ROUTES (Sub-resources first) =====

  @Get(':id/pending-balance')
  async getPatientPendingBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.billingService.getPatientPendingBalance(user, id);
    return { message: 'Patient balance fetched.', data };
  }

  @Get(':id/medical-conditions')
  async getPatientMedicalConditions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.getPatientMedicalConditions(
      user,
      id,
    );
    return { message: 'Patient medical conditions fetched.', data };
  }

  @Post(':id/medical-conditions')
  async addPatientMedicalCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMedicalConditionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.addPatientMedicalCondition(
      user,
      id,
      dto,
    );
    return { message: 'Medical condition added successfully.', data };
  }

  @Put(':id/medical-conditions/:conditionId')
  async updatePatientMedicalCondition(
    @Param('id', ParseUUIDPipe) patientId: string,
    @Param('conditionId', ParseUUIDPipe) conditionId: string,
    @Body() dto: UpdatePatientMedicalConditionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.updatePatientMedicalCondition(
      user,
      patientId,
      conditionId,
      dto,
    );
    return { message: 'Medical condition notes updated successfully.', data };
  }

  @Delete(':id/medical-conditions/:conditionId')
  async removePatientMedicalCondition(
    @Param('id', ParseUUIDPipe) patientId: string,
    @Param('conditionId', ParseUUIDPipe) conditionId: string,
    @CurrentUser() user: any,
  ) {
    await this.patientService.removePatientMedicalCondition(
      user,
      patientId,
      conditionId,
    );
    return { message: 'Medical condition removed successfully.', data: null };
  }

  @Get(':id/dental-history/:tooth')
  async getToothHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tooth') tooth: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.getToothHistory(user, id, tooth);
    return { message: 'Tooth history fetched.', data };
  }

  @Patch(':id/status')
  async updatePatientStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientStatusDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.updatePatientStatus(user, id, dto);
    return { message: 'Patient status updated successfully.', data };
  }

  // ===== DYNAMIC :id ROUTES (Main resource last) =====

  @Get(':id')
  async getPatientById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.getPatientById(user, id);
    return { message: 'Patient profile fetched.', data };
  }

  @Put(':id')
  async updatePatient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.updatePatient(user, id, dto);
    return { message: 'Patient updated successfully.', data };
  }
}
