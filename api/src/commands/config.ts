import type { Config } from '../core/config.ts';
import { getConfig } from '../core/index.ts';

/**
 * Format configuration as a human-readable string
 */
export function formatConfig(cfg: Config): string {
  const lines = [
    'Current Configuration:',
    '',
    `  Host:                 ${cfg.host}`,
    `  Port:                 ${cfg.port}`,
    `  Data Directory:       ${cfg.dataDir}`,
    `  Log Level:            ${cfg.logLevel}`,
    `  Log Format:           ${cfg.logFormat}`,
    `  Runner Poll Interval: ${cfg.runnerPollInterval}ms`,
    `  Temp Directory:       ${cfg.tempDir}`,
    '',
    'Environment Variables:',
    '',
    `  MALAMAR_HOST=${process.env['MALAMAR_HOST'] ?? '(not set)'}`,
    `  MALAMAR_PORT=${process.env['MALAMAR_PORT'] ?? '(not set)'}`,
    `  MALAMAR_DATA_DIR=${process.env['MALAMAR_DATA_DIR'] ?? '(not set)'}`,
    `  MALAMAR_LOG_LEVEL=${process.env['MALAMAR_LOG_LEVEL'] ?? '(not set)'}`,
    `  MALAMAR_LOG_FORMAT=${process.env['MALAMAR_LOG_FORMAT'] ?? '(not set)'}`,
    `  MALAMAR_RUNNER_POLL_INTERVAL=${process.env['MALAMAR_RUNNER_POLL_INTERVAL'] ?? '(not set)'}`,
    `  MALAMAR_TEMP_DIR=${process.env['MALAMAR_TEMP_DIR'] ?? '(not set)'}`,
  ];

  return lines.join('\n');
}

/**
 * Config command - prints current configuration
 *
 * Shows effective values after defaults/flags/env resolution.
 * Exits with code 0.
 */
export function config(): void {
  const cfg = getConfig();
  console.log(formatConfig(cfg));
  process.exit(0);
}
