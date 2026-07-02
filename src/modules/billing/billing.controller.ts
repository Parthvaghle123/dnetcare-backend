import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) { }

  @Post()
  async createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: any) {
    const data = await this.billingService.createInvoice(user, dto);
    return { message: 'Invoice created successfully.', data };
  }

  @Get()
  async getInvoices(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.billingService.getInvoices(user, query);
    return { message: 'Invoices fetched successfully.', data };
  }

  @Put(':id')
  async updateInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: any
  ) {
    const data = await this.billingService.updateInvoice(user, id, dto);
    return { message: 'Invoice updated successfully.', data };
  }

  @Get(':id')
  async getInvoiceById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.billingService.getInvoiceById(user, id);
    return { message: 'Invoice fetched.', data };
  }

  @Post(':id/payments')
  async createPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: any
  ) {
    const data = await this.billingService.createPayment(user, id, dto);
    const message = data.invoice_summary.status === 'PAID'
      ? 'Payment recorded. Invoice is now fully paid.'
      : `Payment recorded. Pending balance: ₹${data.invoice_summary.pending_amount}`;
    return { message, data };
  }

  @Get(':id/payments')
  @UseGuards(JwtAuthGuard)
  async getInvoicePayments(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.billingService.getInvoicePayments(id, user);
    return { message: 'Invoice payments fetched.', data };
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelInvoice(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.billingService.cancelInvoice(id, user);
    return { message: 'Invoice cancelled successfully.', data };
  }

  @Delete(':id')
  async deleteInvoice(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.billingService.deleteInvoice(user, id);
    return { message: 'Invoice deleted successfully.', data };
  }
}
