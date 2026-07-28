import { Controller, Get, Logger } from '@nestjs/common';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  @Get()
  getHello() {
    this.logger.log('Health check endpoint / was accessed');
    return {
      success: true,
      message: 'Dental API is running',
      timestamp: new Date().toISOString(),
    };
  }
}
