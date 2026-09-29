import 'reflect-metadata';
import { bootstrapServer, config } from '../src/main';

export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrapServer();
    return app(req, res);
  } catch (error: any) {
    console.error('[Vercel Serverless Handler Error]:', error);
    if (!res.headersSent) {
      const origin = req.headers?.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Accept, X-Requested-With, X-CSRF-Token, ngrok-skip-browser-warning',
      );
      return res.status(500).json({
        statusCode: 500,
        message: 'Internal server error during serverless execution',
        error: error?.message || String(error),
      });
    }
  }
}

export { config };
