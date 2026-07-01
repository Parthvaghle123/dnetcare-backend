import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateMedicalConditionDto } from './dto/create-medical-condition.dto';

@Controller('medical-conditions')
@UseGuards(JwtAuthGuard)
export class MedicalConditionController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  async getMedicalConditions(@CurrentUser() user: any) {
    const data = await this.patientService.getMedicalConditions(user);
    return { message: 'Medical conditions fetched successfully.', data };
  }

  @Post()
  async createMedicalCondition(@Body() dto: CreateMedicalConditionDto, @CurrentUser() user: any) {
    const data = await this.patientService.createMedicalCondition(user, dto);
    return { message: 'Medical condition created successfully.', data };
  }
}
