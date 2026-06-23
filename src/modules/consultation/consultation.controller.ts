import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { BulkDentalChartDto } from './dto/dental-chart.dto';
import { BulkConsultationDocumentDto } from './dto/consultation-document.dto';

@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Post()
  async createConsultation(@Body() dto: CreateConsultationDto, @CurrentUser() user: any) {
    const data = await this.consultationService.createConsultation(user, dto);
    return { message: 'Consultation created successfully.', data };
  }

  @Get(':id/documents')
  async getDocuments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.consultationService.getConsultationDocuments(id, user);
    return { message: 'Documents fetched.', data };
  }

  @Get(':id')
  async getConsultationById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.consultationService.getConsultationById(user, id);
    return { message: 'Consultation fetched.', data };
  }

  @Put(':id')
  async updateConsultation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConsultationDto, @CurrentUser() user: any) {
    const data = await this.consultationService.updateConsultation(user, id, dto);
    return { message: 'Consultation updated successfully.', data };
  }

  @Post(':id/chart')
  async addDentalChartEntry(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BulkDentalChartDto, @CurrentUser() user: any) {
    const data = await this.consultationService.addDentalChartEntry(user, id, dto);
    return { message: 'Dental chart updated successfully.', data };
  }

  @Post(':id/documents')
  async addDocument(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BulkConsultationDocumentDto, @CurrentUser() user: any) {
    const data = await this.consultationService.addDocument(user, id, dto);
    return { message: 'Documents attached to consultation.', data };
  }
  @Get()
  async listConsultations(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.consultationService.listConsultations(user, query);
    return { message: 'Consultations fetched successfully.', data };
  }

  @Patch(':id/complete')
  async completeConsultation(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.consultationService.completeConsultation(user, id);
    return { message: 'Consultation marked as completed.', data };
  }
}
