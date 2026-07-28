import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateMedicalConditionDto } from './dto/create-medical-condition.dto';
import { UpdateMedicalConditionDto } from './dto/update-medical-condition.dto';
import { UpdateMedicalConditionStatusDto } from './dto/update-medical-condition-status.dto';

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
  async createMedicalCondition(
    @Body() dto: CreateMedicalConditionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.createMedicalCondition(user, dto);
    return { message: 'Medical condition created successfully.', data };
  }

  @Put(':id')
  async updateMedicalCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalConditionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.updateMedicalCondition(
      user,
      id,
      dto,
    );
    return { message: 'Medical condition updated successfully.', data };
  }

  @Patch(':id/status')
  async updateMedicalConditionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalConditionStatusDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.patientService.updateMedicalConditionStatus(
      user,
      id,
      dto,
    );
    return { message: 'Medical condition status updated successfully.', data };
  }

  @Delete(':id')
  async deleteMedicalCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.patientService.deleteMedicalCondition(user, id);
    return { message: 'Medical condition deleted successfully.', data: null };
  }
}
