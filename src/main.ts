import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

let cachedApp: any;

async function bootstrapServer() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);
    
    app.enableCors();
    app.setGlobalPrefix('api/v1');
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }
  return cachedApp;
}

// Start local server if not running in Vercel
if (!process.env.VERCEL) {
  async function startLocal() {
    const app = await NestFactory.create(AppModule);
    
    app.enableCors();
    app.setGlobalPrefix('api/v1');
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 7000;
    
    await app.listen(port);
    const logger = new Logger('Bootstrap');
    logger.log(`🚀 Application successfully started and listening on port ${port}`);
  }
  startLocal();
}

// Export default handler for Vercel Serverless Functions
export default async function handler(req: any, res: any) {
  const app = await bootstrapServer();
  return app(req, res);
}
