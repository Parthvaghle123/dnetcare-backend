import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

const corsOptions = {
  origin: (origin: string, callback: any) => {
    const allowedOrigins = [
      'https://www.dentcare360.in',
      'https://dentcare360.in',
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    const envFrontendUrl = process.env.FRONTEND_URL;
    if (envFrontendUrl) {
      const urls = envFrontendUrl
        .split(/[\s,]+/)
        .map((url) => url.trim())
        .filter(Boolean);
      urls.forEach((url) => {
        if (!allowedOrigins.includes(url)) {
          allowedOrigins.push(url);
        }
      });
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version',
    'X-CSRF-Token',
    'ngrok-skip-browser-warning',
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

let cachedApp: any;

async function bootstrapServer() {
  if (!cachedApp) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.enableCors(corsOptions);
    app.useStaticAssets(join(__dirname, '..', 'public'));

    app.use((req: any, res: any, next: any) => {
      console.log(
        '======> req url:',
        req.url,
        '======> req method:',
        req.method,
      );
      next();
    });

    app.use('/', (req: any, res: any, next: any) => {
      if (req.path === '/') {
        return res.json('Dental Server working!');
      }
      next();
    });

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

// Start local server if not running in Vercel
if (!process.env.VERCEL) {
  async function startLocal() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.enableCors(corsOptions);
    app.useStaticAssets(join(__dirname, '..', 'public'));

    app.use((req: any, res: any, next: any) => {
      console.log(
        '======> req url:',
        req.url,
        '======> req method:',
        req.method,
      );
      next();
    });

    app.use('/', (req: any, res: any, next: any) => {
      if (req.path === '/') {
        return res.json('Dental Server working!');
      }
      next();
    });

    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 7000;

    await app.listen(port);
    const logger = new Logger('Bootstrap');
    logger.log(
      `🚀 Application successfully started and listening on port ${port}`,
    );
  }
  startLocal();
}

// Export default handler for Vercel Serverless Functions
export default async function handler(req: any, res: any) {
  const app = await bootstrapServer();
  return app(req, res);
}
