import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

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

  @Get(':id')
  async getPatientById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.patientService.getPatientById(user, id);
    return { message: 'Patient profile fetched.', data };
  }

  @Put(':id')
  async updatePatient(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto, @CurrentUser() user: any) {
    const data = await this.patientService.updatePatient(user, id, dto);
    return { message: 'Patient updated successfully.', data };
  }
}
