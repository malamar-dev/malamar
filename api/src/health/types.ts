import type { CliType } from '../core/types.ts';

/**
 * Overall health status
 */
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  database: DatabaseHealth;
  timestamp: string;
}

/**
 * Database health information
 */
export interface DatabaseHealth {
  status: 'ok' | 'error';
  path: string;
  error?: string;
}

/**
 * CLI health status for a single CLI
 */
export interface CliHealthStatus {
  cliType: CliType;
  status: 'healthy' | 'unhealthy' | 'not_found' | 'unknown';
  binaryPath?: string;
  version?: string;
  error?: string;
  lastChecked: string;
}

/**
 * Result of a CLI health check
 */
export interface CliHealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'not_found';
  binaryPath?: string;
  version?: string;
  error?: string;
}
