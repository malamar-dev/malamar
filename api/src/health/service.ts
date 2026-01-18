import { getConfig } from '../core/config.ts';
import { getDb } from '../core/database.ts';
import type { CliType } from '../core/types.ts';
import { CLI_TYPES } from '../core/types.ts';
import { now } from '../shared/index.ts';
import type { CliHealthCheckResult, CliHealthStatus, HealthStatus } from './types.ts';

// Store CLI health status in memory
const cliHealthCache = new Map<CliType, CliHealthStatus>();

// Store the start time for uptime calculation
const startTime = Date.now();

/**
 * Get overall health status of the API
 */
export function getOverallHealth(): HealthStatus {
  const dbHealth = checkDatabaseHealth();

  // Determine overall status based on database health
  const status = dbHealth.status === 'ok' ? 'ok' : 'error';

  return {
    status,
    version: '0.1.0', // TODO: Read from package.json
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: dbHealth,
    timestamp: now(),
  };
}

/**
 * Check database health
 */
function checkDatabaseHealth(): HealthStatus['database'] {
  const config = getConfig();
  const dbPath = `${config.dataDir}/malamar.db`;

  try {
    const db = getDb();
    // Try a simple query to verify DB is accessible
    db.query('SELECT 1').get();
    return {
      status: 'ok',
      path: dbPath,
    };
  } catch (error) {
    return {
      status: 'error',
      path: dbPath,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Get CLI health status for all configured CLIs
 */
export function getCliHealth(): CliHealthStatus[] {
  const statuses: CliHealthStatus[] = [];

  for (const cliType of CLI_TYPES) {
    const cached = cliHealthCache.get(cliType);
    if (cached) {
      statuses.push(cached);
    } else {
      statuses.push({
        cliType,
        status: 'unknown',
        lastChecked: now(),
      });
    }
  }

  return statuses;
}

/**
 * Get health status for a specific CLI
 */
export function getCliHealthByType(cliType: CliType): CliHealthStatus | null {
  return cliHealthCache.get(cliType) ?? null;
}

/**
 * Refresh CLI health status for all CLIs
 */
export async function refreshCliHealth(): Promise<void> {
  for (const cliType of CLI_TYPES) {
    const result = await checkCliHealth(cliType);
    cliHealthCache.set(cliType, {
      cliType,
      status: result.status,
      binaryPath: result.binaryPath,
      version: result.version,
      error: result.error,
      lastChecked: now(),
    });
  }
}

/**
 * Check health of a specific CLI
 */
async function checkCliHealth(cliType: CliType): Promise<CliHealthCheckResult> {
  // TODO: Implement actual CLI detection when CLI adapters are ready
  // For now, return not_found for all CLIs
  return {
    status: 'not_found',
    error: `CLI adapter for ${cliType} not yet implemented`,
  };
}

/**
 * Update CLI health status (called by CLI adapter health checks)
 */
export function updateCliHealth(cliType: CliType, result: CliHealthCheckResult): void {
  cliHealthCache.set(cliType, {
    cliType,
    status: result.status,
    binaryPath: result.binaryPath,
    version: result.version,
    error: result.error,
    lastChecked: now(),
  });
}

/**
 * Check if any CLI is healthy
 */
export function hasHealthyCli(): boolean {
  for (const status of cliHealthCache.values()) {
    if (status.status === 'healthy') {
      return true;
    }
  }
  return false;
}

/**
 * Clear the CLI health cache (for testing)
 */
export function clearCliHealthCache(): void {
  cliHealthCache.clear();
}
