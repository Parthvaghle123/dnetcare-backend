import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Starting application initialization...');

  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  app.setGlobalPrefix('api/v1');
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 7000;
  
  await app.listen(port);
  logger.log(`🚀 Application successfully started and listening on port ${port}`);
  logger.log(`Global API Prefix is set to: api/v1`);
}
bootstrap();
