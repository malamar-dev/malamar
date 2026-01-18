import { logger } from '../core/index.ts';
import { runCleanup } from './cleanup.ts';
import { runHealthCheck } from './health-check.ts';

/**
 * Job intervals in milliseconds
 */
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * State for tracking job timers
 */
interface JobsState {
  cleanupTimer: ReturnType<typeof setInterval> | null;
  healthCheckTimer: ReturnType<typeof setInterval> | null;
  running: boolean;
}

const state: JobsState = {
  cleanupTimer: null,
  healthCheckTimer: null,
  running: false,
};

/**
 * Start all scheduled jobs
 *
 * This starts the job scheduler which runs:
 * - Cleanup job: immediately on startup, then daily
 * - Health check job: immediately on startup, then every 5 minutes
 */
export async function startJobs(): Promise<void> {
  if (state.running) {
    logger.warn('Jobs already running, ignoring startJobs call');
    return;
  }

  logger.info('Starting job scheduler');
  state.running = true;

  // Run jobs immediately on startup
  await runStartupJobs();

  // Schedule cleanup job (daily)
  state.cleanupTimer = setInterval(() => {
    runCleanup().catch((error) => {
      logger.error('Scheduled cleanup job failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, CLEANUP_INTERVAL_MS);

  // Schedule health check job (every 5 minutes)
  state.healthCheckTimer = setInterval(() => {
    runHealthCheck().catch((error) => {
      logger.error('Scheduled health check job failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, HEALTH_CHECK_INTERVAL_MS);

  logger.info('Job scheduler started', {
    cleanupIntervalMs: CLEANUP_INTERVAL_MS,
    healthCheckIntervalMs: HEALTH_CHECK_INTERVAL_MS,
  });
}

/**
 * Run jobs that should execute on startup
 */
async function runStartupJobs(): Promise<void> {
  logger.info('Running startup jobs');

  // Run health check first (fast, important for CLI availability)
  try {
    await runHealthCheck();
  } catch (error) {
    logger.error('Startup health check job failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Run cleanup (can be slower, less critical)
  try {
    runCleanup();
  } catch (error) {
    logger.error('Startup cleanup job failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info('Startup jobs completed');
}

/**
 * Stop all scheduled jobs
 *
 * This stops the job scheduler and clears all timers.
 * Call this during graceful shutdown.
 */
export function stopJobs(): void {
  if (!state.running) {
    logger.debug('Jobs not running, ignoring stopJobs call');
    return;
  }

  logger.info('Stopping job scheduler');

  if (state.cleanupTimer) {
    clearInterval(state.cleanupTimer);
    state.cleanupTimer = null;
  }

  if (state.healthCheckTimer) {
    clearInterval(state.healthCheckTimer);
    state.healthCheckTimer = null;
  }

  state.running = false;
  logger.info('Job scheduler stopped');
}

/**
 * Check if jobs are currently running
 */
export function isJobsRunning(): boolean {
  return state.running;
}

// Re-export job functions and types
export type { CleanupResult } from './cleanup.ts';
export { runCleanup } from './cleanup.ts';
export type { CliHealthStatus, HealthCheckResult } from './health-check.ts';
export {
  clearHealthStatus,
  getAllCliHealthStatus,
  getCliHealthStatus,
  getFirstHealthyCliType,
  isCliHealthy,
  runHealthCheck,
} from './health-check.ts';

// Export interval constants for testing
export { CLEANUP_INTERVAL_MS, HEALTH_CHECK_INTERVAL_MS };
