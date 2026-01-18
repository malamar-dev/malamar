import { checkCliHealth } from '../cli/index.ts';
import type { CliHealthResult } from '../cli/types.ts';
import { logger } from '../core/index.ts';
import type { CliType } from '../core/types.ts';
import { CLI_TYPES } from '../core/types.ts';

/**
 * In-memory storage for CLI health status
 */
export interface CliHealthStatus {
  cliType: CliType;
  result: CliHealthResult;
  lastChecked: string;
}

/**
 * Health status store - keyed by CLI type
 */
const healthStatusStore: Map<CliType, CliHealthStatus> = new Map();

/**
 * Get the health status for all CLIs
 */
export function getAllCliHealthStatus(): CliHealthStatus[] {
  return Array.from(healthStatusStore.values());
}

/**
 * Get the health status for a specific CLI
 */
export function getCliHealthStatus(cliType: CliType): CliHealthStatus | undefined {
  return healthStatusStore.get(cliType);
}

/**
 * Check if a CLI is healthy
 */
export function isCliHealthy(cliType: CliType): boolean {
  const status = healthStatusStore.get(cliType);
  return status?.result.status === 'healthy';
}

/**
 * Get the first healthy CLI type
 */
export function getFirstHealthyCliType(): CliType | null {
  for (const cliType of CLI_TYPES) {
    if (isCliHealthy(cliType)) {
      return cliType;
    }
  }
  return null;
}

/**
 * Result of a health check run
 */
export interface HealthCheckResult {
  checked: number;
  healthy: number;
  unhealthy: number;
  notFound: number;
  errors: string[];
}

/**
 * Run health checks for all supported CLIs
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  logger.info('Starting CLI health check job');

  const result: HealthCheckResult = {
    checked: 0,
    healthy: 0,
    unhealthy: 0,
    notFound: 0,
    errors: [],
  };

  for (const cliType of CLI_TYPES) {
    try {
      const healthResult = await checkCliHealth(cliType);
      const timestamp = new Date().toISOString();

      // Store the result
      healthStatusStore.set(cliType, {
        cliType,
        result: healthResult,
        lastChecked: timestamp,
      });

      result.checked++;

      switch (healthResult.status) {
        case 'healthy':
          result.healthy++;
          logger.debug('CLI health check passed', {
            cliType,
            version: healthResult.version,
            durationMs: healthResult.durationMs,
          });
          break;
        case 'unhealthy':
          result.unhealthy++;
          logger.warn('CLI health check failed', {
            cliType,
            error: healthResult.error,
            durationMs: healthResult.durationMs,
          });
          break;
        case 'not_found':
          result.notFound++;
          logger.debug('CLI not found', {
            cliType,
            error: healthResult.error,
          });
          break;
      }
    } catch (error) {
      const errorMsg = `Health check failed for ${cliType}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('CLI health check error', {
        cliType,
        error: error instanceof Error ? error.message : String(error),
      });
      result.errors.push(errorMsg);
    }
  }

  logger.info('CLI health check job completed', {
    checked: result.checked,
    healthy: result.healthy,
    unhealthy: result.unhealthy,
    notFound: result.notFound,
  });

  return result;
}

/**
 * Clear all stored health status (for testing)
 */
export function clearHealthStatus(): void {
  healthStatusStore.clear();
}
