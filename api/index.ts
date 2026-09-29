import 'reflect-metadata';

let cachedServer: any;

async function getServer() {
  if (!cachedServer) {
    let mainModule: any;
    try {
      // Try loading precompiled dist (full tsc decorator metadata for NestJS on Vercel)
      mainModule = require('../dist/src/main');
    } catch {
      mainModule = require('../src/main');
    }
    cachedServer = await mainModule.bootstrapServer();
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  // Always handle OPTIONS preflight immediately with CORS headers
  const origin = req.headers?.origin || req.headers?.referer || '*';

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, X-Requested-With, X-CSRF-Token, ngrok-skip-browser-warning, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  try {
    const app = await getServer();
    return app(req, res);
  } catch (error: any) {
    console.error('[Vercel Serverless Handler Error]:', error);
    if (!res.headersSent) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Accept, X-Requested-With, X-CSRF-Token, ngrok-skip-browser-warning, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
      );
      return res.status(500).json({
        statusCode: 500,
        message: 'Internal server error during serverless execution',
        error: error?.message || String(error),
      });
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
