import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentSubscription(@CurrentUser() user: any) {
    const organizationId = user.org_id;
    return this.subscriptionService.getCurrentSubscription(organizationId);
  }

  @UseGuards(JwtAuthGuard)

  @Post('checkout')
  async checkout(@Body() body: { plan_id: string }, @CurrentUser() user: any) {
    const organizationId = user.org_id;
    return this.subscriptionService.checkout(organizationId, body.plan_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifyPayment(@Body() body: any) {
    return this.subscriptionService.verifyPayment(body);
  }
}
