import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Hono } from 'hono';

import { agentRoutes, workspaceAgentRoutes } from '../agent/index.ts';
import { chatRoutes, workspaceChatRoutes } from '../chat/index.ts';
import { closeDb, getConfig, initDb, isAppError, logger, runMigrations } from '../core/index.ts';
import { eventsRoutes, initSseRegistry, shutdownSseRegistry } from '../events/index.ts';
import { healthRoutes } from '../health/index.ts';
import { startJobs, stopJobs } from '../jobs/index.ts';
import { startRunner, stopRunner } from '../runner/index.ts';
import { settingsRoutes } from '../settings/index.ts';
import { taskRoutes, workspaceTaskRoutes } from '../task/index.ts';
import { workspaceRoutes } from '../workspace/index.ts';

/**
 * Create the Hono application with all routes mounted
 */
function createApp(): Hono {
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
  app.route('/api/workspaces', workspaceRoutes);
  app.route('/api/workspaces', workspaceAgentRoutes);
  app.route('/api/workspaces', workspaceTaskRoutes);
  app.route('/api/workspaces', workspaceChatRoutes);
  app.route('/api/agents', agentRoutes);
  app.route('/api/tasks', taskRoutes);
  app.route('/api/chats', chatRoutes);
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
    return c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  });

  return app;
}

/**
 * Check if this is the first launch of the application
 *
 * First launch is detected by checking if the data directory doesn't exist
 * and the database file doesn't exist.
 */
function isFirstLaunch(): boolean {
  const config = getConfig();
  const dbPath = join(config.dataDir, 'malamar.db');
  return !existsSync(dbPath);
}

/**
 * Create sample workspace on first launch
 *
 * This is a placeholder that will be implemented when the instructions module is created.
 */
function createSampleWorkspaceIfNeeded(firstLaunch: boolean): void {
  if (!firstLaunch) {
    return;
  }

  // TODO: Implement when instructions/sample-workspace.ts is created
  // For now, just log that this is a first launch
  logger.info('First launch detected, sample workspace creation will be implemented in Phase 11');
}

/**
 * Server state for tracking shutdown
 */
interface ServerState {
  isShuttingDown: boolean;
  server: ReturnType<typeof Bun.serve> | null;
}

const state: ServerState = {
  isShuttingDown: false,
  server: null,
};

/**
 * Perform graceful shutdown
 */
async function shutdown(): Promise<void> {
  if (state.isShuttingDown) {
    return;
  }

  state.isShuttingDown = true;
  logger.info('Shutting down...');

  // Stop accepting new queue pickups and kill active subprocesses
  await stopRunner();

  // Stop scheduled jobs
  stopJobs();

  // Close SSE connections
  shutdownSseRegistry();

  // Close database connection
  closeDb();

  // Stop HTTP server
  if (state.server) {
    state.server.stop();
    state.server = null;
  }

  logger.info('Shutdown complete');
  process.exit(0);
}

/**
 * Register shutdown signal handlers
 */
function registerShutdownHandlers(): void {
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal');
    shutdown();
  });

  process.on('SIGINT', () => {
    logger.info('Received SIGINT signal');
    shutdown();
  });
}

/**
 * Serve command - starts the HTTP server
 *
 * This is the main entry point for the application:
 * 1. Initialize config
 * 2. Initialize database, run migrations
 * 3. Check first startup, create sample workspace if needed
 * 4. Initialize SSE registry
 * 5. Start background jobs
 * 6. Start runner (queue processing)
 * 7. Create Hono app
 * 8. Start HTTP server
 * 9. Register shutdown handlers
 */
export async function serve(): Promise<void> {
  // Load configuration
  const config = getConfig();
  logger.info('Starting Malamar server', {
    host: config.host,
    port: config.port,
    dataDir: config.dataDir,
    logLevel: config.logLevel,
  });

  // Check first launch before initializing database
  const firstLaunch = isFirstLaunch();
  if (firstLaunch) {
    logger.info('First launch detected');
  }

  // Initialize database and run migrations
  initDb();
  runMigrations();

  // Create sample workspace if first launch
  createSampleWorkspaceIfNeeded(firstLaunch);

  // Initialize SSE registry
  initSseRegistry();

  // Start background jobs (cleanup, health check)
  await startJobs();

  // Start runner (queue processing)
  startRunner();

  // Create app
  const app = createApp();

  // Start HTTP server
  state.server = Bun.serve({
    hostname: config.host,
    port: config.port,
    fetch: app.fetch,
  });

  logger.info('Server started', {
    url: `http://${config.host}:${config.port}`,
  });

  // Register shutdown handlers
  registerShutdownHandlers();
}
