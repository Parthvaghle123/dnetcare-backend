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
import { TreatmentService } from './treatment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';
import { UpdateTreatmentPlanStatusDto } from './dto/update-treatment-plan-status.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';

@Controller('treatment-plans')
@UseGuards(JwtAuthGuard)
export class TreatmentController {
  constructor(private readonly treatmentService: TreatmentService) {}

  @Post()
  async createTreatmentPlan(
    @Body() dto: CreateTreatmentPlanDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.createTreatmentPlan(user, dto);
    return { message: 'Treatment plan created successfully.', data };
  }

  @Get(':id')
  async getTreatmentPlanById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.getTreatmentPlanById(user, id);
    return { message: 'Treatment plan fetched.', data };
  }

  @Post(':id/phases')
  async addPhase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePhaseDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.addPhase(user, id, dto);
    return { message: 'Phase added to treatment plan.', data };
  }

  @Patch(':planId/phases/:phaseId/complete')
  async completePhase(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.completePhase(
      user,
      planId,
      phaseId,
    );
    const msg = data.allDone
      ? 'Phase completed. Treatment plan is now fully completed.'
      : 'Phase marked as completed.';

    // Remove internal flag before returning
    delete (data as any).allDone;

    return { message: msg, data };
  }

  @Get()
  async listTreatmentPlans(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.treatmentService.listTreatmentPlans(user, query);
    return { message: 'Treatment plans fetched successfully.', data };
  }

  @Put(':id')
  async updateTreatmentPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentPlanDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.updateTreatmentPlan(user, id, dto);
    return { message: 'Treatment plan updated successfully.', data };
  }

  @Patch(':id/status')
  async updateTreatmentPlanStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentPlanStatusDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.updateTreatmentPlanStatus(
      user,
      id,
      dto,
    );
    return { message: 'Treatment plan status updated.', data };
  }

  @Get(':id/phases')
  async listPhases(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.listPhases(user, id);
    return { message: 'Treatment plan phases fetched.', data };
  }

  @Put(':planId/phases/:phaseId')
  async updatePhase(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Body() dto: UpdatePhaseDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.updatePhase(
      user,
      planId,
      phaseId,
      dto,
    );
    return { message: 'Treatment plan phase updated.', data };
  }

  @Delete(':planId/phases/:phaseId')
  async removePhase(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.treatmentService.removePhase(user, planId, phaseId);
    return { message: 'Treatment plan phase removed.', data };
  }

  @Delete(':id')
  async deleteTreatmentPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.treatmentService.deleteTreatmentPlan(user, id);
  }
}
