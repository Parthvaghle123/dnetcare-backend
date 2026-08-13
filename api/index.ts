import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { corsOptions } from '../src/main';

let cachedApp: any;

async function bootstrapServer() {
  if (!cachedApp) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.useStaticAssets(join(__dirname, '..', 'public'));
    
    app.use('/', (req: any, res: any, next: any) => {
      if (req.path === '/') {
        return res.json('Dental Server working!');
      }
      next();
    });

    app.enableCors(corsOptions);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }
  return cachedApp;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrapServer();
  return app(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
