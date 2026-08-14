import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  async createTicket(
    @CurrentUser() user: any,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportService.createTicket(user.sub, user.org_id, dto);
  }

  @Get()
  async getTickets(@CurrentUser() user: any) {
    if (user.role === 'MAIN_ADMIN') {
      return this.supportService.getAllTickets();
    }
    return this.supportService.getTicketsByUser(user.sub);
  }

  @Get(':id')
  async getTicketById(@Param('id') id: string) {
    return this.supportService.getTicketById(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.supportService.updateTicketStatus(id, status);
  }
}
