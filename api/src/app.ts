import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

import { agentRoutes, workspaceAgentRoutes } from './agent/index.ts';
import { chatRoutes, workspaceChatRoutes } from './chat/index.ts';
import { isAppError, logger } from './core/index.ts';
import { eventsRoutes } from './events/index.ts';
import { healthRoutes } from './health/index.ts';
import { settingsRoutes } from './settings/index.ts';
import { taskRoutes, workspaceTaskRoutes } from './task/index.ts';
import { workspaceRoutes } from './workspace/index.ts';

/**
 * Create the Hono application with all routes mounted
 *
 * The application includes:
 * - Request logging middleware
 * - API routes for all domain modules
 * - Global error handling
 * - 404 handler for unknown routes
 * - Static file serving (placeholder for frontend)
 * - SPA fallback for non-API routes
 */
export function createApp(): Hono {
  const app = new Hono();

  // Request logging middleware
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    logger.debug('Request completed', {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
    });
  });

  // Mount API routes
  // Workspace routes (includes nested agent, task, chat routes for workspace-scoped endpoints)
  app.route('/api/workspaces', workspaceRoutes);
  app.route('/api/workspaces', workspaceAgentRoutes);
  app.route('/api/workspaces', workspaceTaskRoutes);
  app.route('/api/workspaces', workspaceChatRoutes);

  // Direct routes (for endpoints that don't require workspace context)
  app.route('/api/agents', agentRoutes);
  app.route('/api/tasks', taskRoutes);
  app.route('/api/chats', chatRoutes);

  // Other API routes
  app.route('/api/settings', settingsRoutes);
  app.route('/api/health', healthRoutes);
  app.route('/api/events', eventsRoutes);

  // Global error handler
  app.onError((err, c) => {
    if (isAppError(err)) {
      logger.warn('Application error', {
        code: err.code,
        message: err.message,
        path: c.req.path,
      });
      return c.json({ error: { code: err.code, message: err.message } }, err.statusCode);
    }

    logger.error('Unexpected error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      path: c.req.path,
    });
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
  });

  // 404 handler for unknown API routes
  app.notFound((c) => {
    // For API routes, return JSON error
    if (c.req.path.startsWith('/api/')) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }

    // For non-API routes, return 404 JSON (SPA fallback handled below)
    return c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  });

  // Static file serving from public/ directory
  // Files with hash in filename get long-term caching (e.g., main.abc123.js)
  app.use(
    '*',
    serveStatic({
      root: './public',
      onFound: (_path, c) => {
        // Set cache headers for hashed filenames (content-based caching)
        // Pattern: filename.hash.ext (e.g., main.abc123.js, styles.def456.css)
        const hashedFilePattern = /\.[a-f0-9]{6,}\.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/i;
        if (hashedFilePattern.test(c.req.path)) {
          // Immutable cache for 1 year - hashed files never change
          c.header('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // Short-term cache for non-hashed files (HTML, etc.)
          c.header('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      },
    })
  );

  // SPA fallback: serve index.html for all non-API routes that don't match static files
  // This enables client-side routing in the frontend SPA
  app.get('*', serveStatic({ path: './public/index.html' }));

  return app;
}
