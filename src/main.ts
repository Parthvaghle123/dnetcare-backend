import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.dentcare360.in',
  'https://dentcare360.in',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://dental-frontend.vercel.app',
  'https://dental-frontend-iota.vercel.app',
];

export function getAllowedOrigins(): string[] {
  const origins = new Set<string>(
    DEFAULT_ALLOWED_ORIGINS.map((origin) => origin.replace(/\/$/, '')),
  );

  const envFrontendUrl = process.env.FRONTEND_URL;
  if (envFrontendUrl) {
    const urls = envFrontendUrl
      .split(/[\s,]+/)
      .map((url) => url.trim().replace(/\/$/, ''))
      .filter(Boolean);
    urls.forEach((url) => origins.add(url));
  }

  return Array.from(origins);
}

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();
    const normalizedOrigin = origin.trim().replace(/\/$/, '');

    const isAllowed =
      allowedOrigins.includes(normalizedOrigin) ||
      allowedOrigins.includes(origin) ||
      normalizedOrigin.endsWith('.dentcare360.in') ||
      normalizedOrigin === 'https://dentcare360.in' ||
      /^https:\/\/dental-frontend[a-zA-Z0-9-]*\.vercel\.app$/.test(normalizedOrigin);

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'X-CSRF-Token',
    'ngrok-skip-browser-warning',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export async function createNestApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Enable CORS as early as possible in bootstrap
  app.enableCors(corsOptions);

  // 2. Useful request logging for debugging
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers?.origin || req.headers?.referer || 'No Origin';
    console.log(
      `======> req method: ${req.method} | url: ${req.url} | origin: ${origin}`,
    );
    next();
  });

  // 3. Static assets
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // 4. Root health-check endpoint
  app.use('/', (req: any, res: any, next: any) => {
    if (req.path === '/' && req.method === 'GET') {
      return res.json({
        success: true,
        message: 'Dental Server working!',
        timestamp: new Date().toISOString(),
      });
    }
    next();
  });

  // 5. Global API prefix
  app.setGlobalPrefix('api/v1');

  // 6. Request body parsers (50mb limits)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 7. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}

let cachedServer: any;

export async function bootstrapServer() {
  if (!cachedServer) {
    const app = await createNestApp();
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

// Start local server if not running in Vercel environment
if (!process.env.VERCEL) {
  async function startLocal() {
    const app = await createNestApp();
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

// Disable Vercel's default body parser so Multer/file streams work
export const config = {
  api: {
    bodyParser: false,
  },
};
