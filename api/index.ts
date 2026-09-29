import { bootstrapServer, config } from '../src/main';

export default async function handler(req: any, res: any) {
  const app = await bootstrapServer();
  return app(req, res);
}

export { config };
