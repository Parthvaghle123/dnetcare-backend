import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { TreatmentService } from './treatment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { CreatePhaseDto } from './dto/create-phase.dto';

@Controller('treatment-plans')
@UseGuards(JwtAuthGuard)
export class TreatmentController {
  constructor(private readonly treatmentService: TreatmentService) {}

  @Post()
  async createTreatmentPlan(@Body() dto: CreateTreatmentPlanDto, @CurrentUser() user: any) {
    const data = await this.treatmentService.createTreatmentPlan(user, dto);
    return { message: 'Treatment plan created successfully.', data };
  }

  @Get(':id')
  async getTreatmentPlanById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.treatmentService.getTreatmentPlanById(user, id);
    return { message: 'Treatment plan fetched.', data };
  }

  @Post(':id/phases')
  async addPhase(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePhaseDto, @CurrentUser() user: any) {
    const data = await this.treatmentService.addPhase(user, id, dto);
    return { message: 'Phase added to treatment plan.', data };
  }

  @Patch(':planId/phases/:phaseId/complete')
  async completePhase(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentUser() user: any
  ) {
    const data = await this.treatmentService.completePhase(user, planId, phaseId);
    const msg = data.allDone ? 'Phase completed. Treatment plan is now fully completed.' : 'Phase marked as completed.';
    
    // Remove internal flag before returning
    delete (data as any).allDone;

    return { message: msg, data };
  }
  @Get()
  async listTreatmentPlans(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.treatmentService.listTreatmentPlans(user, query);
    return { message: 'Treatment plans fetched successfully.', data };
  }
}
