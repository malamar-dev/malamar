import { Hono } from 'hono';

import * as service from './service.ts';

export const healthRoutes = new Hono();

// GET /health - Overall health status
healthRoutes.get('/', (c) => {
  const health = service.getOverallHealth();
  const statusCode = health.status === 'ok' ? 200 : 503;
  return c.json({ data: health }, statusCode);
});

// GET /health/cli - CLI health status
healthRoutes.get('/cli', (c) => {
  const health = service.getCliHealth();
  return c.json({ data: health });
});

// POST /health/cli/refresh - Refresh CLI health detection
healthRoutes.post('/cli/refresh', async (c) => {
  await service.refreshCliHealth();
  const health = service.getCliHealth();
  return c.json({ data: health });
});
