import { existsSync, mkdirSync, rmSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';

import { getConfig, getDbPath, getMaxAppliedVersion, getMigrationFiles } from '../core/index.ts';
import type { CliType } from '../core/types.ts';
import { CLI_TYPES } from '../core/types.ts';
import { getAllCliHealthStatus, runHealthCheck } from '../jobs/health-check.ts';

/**
 * Check result with status and optional message
 */
export interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
}

/**
 * Doctor command result
 */
export interface DoctorResult {
  checks: CheckResult[];
  passed: number;
  failed: number;
  warnings: number;
}

/**
 * Format check result for console output
 */
function formatCheck(check: CheckResult): string {
  const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '!';
  const message = check.message ? ` - ${check.message}` : '';
  return `  ${icon} ${check.name}${message}`;
}

/**
 * Check if data directory exists and is writable
 */
function checkDataDirectory(config: ReturnType<typeof getConfig>): CheckResult {
  const dataDir = config.dataDir;

  if (!existsSync(dataDir)) {
    // Try to create it
    try {
      mkdirSync(dataDir, { recursive: true });
      return { name: 'Data directory', status: 'pass', message: `Created ${dataDir}` };
    } catch (error) {
      return {
        name: 'Data directory',
        status: 'fail',
        message: `Cannot create ${dataDir}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Check if writable by creating a temp file
  const testFile = join(dataDir, '.doctor-test');
  try {
    writeFileSync(testFile, 'test');
    rmSync(testFile);
    return { name: 'Data directory', status: 'pass', message: dataDir };
  } catch (error) {
    return {
      name: 'Data directory',
      status: 'fail',
      message: `Not writable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if database is accessible
 */
function checkDatabase(): CheckResult {
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return {
      name: 'Database',
      status: 'warn',
      message: 'Database file does not exist (will be created on first run)',
    };
  }

  try {
    const db = new Database(dbPath, { readonly: true });
    db.close();
    return { name: 'Database', status: 'pass', message: dbPath };
  } catch (error) {
    return {
      name: 'Database',
      status: 'fail',
      message: `Cannot open database: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if migrations are current
 */
function checkMigrations(): CheckResult {
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return {
      name: 'Migrations',
      status: 'warn',
      message: 'Database not initialized (migrations will run on first start)',
    };
  }

  try {
    const migrationsDir = join(process.cwd(), 'migrations');
    const migrationFiles = getMigrationFiles(migrationsDir);
    const latestVersion = migrationFiles.length > 0 ? migrationFiles[migrationFiles.length - 1]!.version : 0;
    const appliedVersion = getMaxAppliedVersion();

    if (appliedVersion === latestVersion) {
      return { name: 'Migrations', status: 'pass', message: `Up to date (v${appliedVersion})` };
    } else if (appliedVersion < latestVersion) {
      return {
        name: 'Migrations',
        status: 'warn',
        message: `Pending migrations (current: v${appliedVersion}, latest: v${latestVersion})`,
      };
    } else {
      return {
        name: 'Migrations',
        status: 'warn',
        message: `Applied version (${appliedVersion}) is ahead of available migrations (${latestVersion})`,
      };
    }
  } catch (error) {
    return {
      name: 'Migrations',
      status: 'fail',
      message: `Cannot check migrations: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check configuration validity
 */
function checkConfiguration(config: ReturnType<typeof getConfig>): CheckResult {
  const issues: string[] = [];

  if (config.port < 1 || config.port > 65535) {
    issues.push(`Invalid port: ${config.port}`);
  }

  if (config.runnerPollInterval < 100) {
    issues.push(`Runner poll interval too low: ${config.runnerPollInterval}ms`);
  }

  if (issues.length > 0) {
    return { name: 'Configuration', status: 'fail', message: issues.join('; ') };
  }

  return { name: 'Configuration', status: 'pass' };
}

/**
 * Check CLI health status
 */
async function checkCliHealth(): Promise<CheckResult[]> {
  // Run health check to populate status
  await runHealthCheck();

  const checks: CheckResult[] = [];
  const statuses = getAllCliHealthStatus();

  // Create a map for easier lookup
  const statusMap = new Map(statuses.map((s) => [s.cliType, s]));

  for (const cliType of CLI_TYPES) {
    const status = statusMap.get(cliType as CliType);

    if (!status) {
      checks.push({
        name: `CLI: ${cliType}`,
        status: 'warn',
        message: 'Not checked',
      });
      continue;
    }

    switch (status.result.status) {
      case 'healthy':
        checks.push({
          name: `CLI: ${cliType}`,
          status: 'pass',
          message: status.result.version ? `v${status.result.version}` : 'Available',
        });
        break;
      case 'unhealthy':
        checks.push({
          name: `CLI: ${cliType}`,
          status: 'warn',
          message: status.result.error ?? 'Unhealthy',
        });
        break;
      case 'not_found':
        checks.push({
          name: `CLI: ${cliType}`,
          status: 'warn',
          message: 'Not installed',
        });
        break;
    }
  }

  return checks;
}

/**
 * Run all doctor checks
 */
export async function runDoctor(): Promise<DoctorResult> {
  const config = getConfig();
  const checks: CheckResult[] = [];

  // Run checks
  checks.push(checkDataDirectory(config));
  checks.push(checkDatabase());
  checks.push(checkMigrations());
  checks.push(checkConfiguration(config));

  // Run CLI health checks
  const cliChecks = await checkCliHealth();
  checks.push(...cliChecks);

  // Count results
  const passed = checks.filter((c) => c.status === 'pass').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const warnings = checks.filter((c) => c.status === 'warn').length;

  return { checks, passed, failed, warnings };
}

/**
 * Doctor command - checks system health and configuration
 *
 * Exits with code 0 if critical checks pass, non-zero otherwise.
 */
export async function doctor(): Promise<void> {
  console.log('Malamar System Check\n');

  const result = await runDoctor();

  // Print results
  for (const check of result.checks) {
    console.log(formatCheck(check));
  }

  console.log('');
  console.log(`Passed: ${result.passed}, Failed: ${result.failed}, Warnings: ${result.warnings}`);

  // Exit with non-zero if any critical checks failed
  if (result.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
}
