import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

export interface Config {
  host: string;
  port: number;
  dataDir: string;
  logLevel: LogLevel;
  logFormat: LogFormat;
  runnerPollInterval: number;
  tempDir: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'text' | 'json';

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];
const LOG_FORMATS: LogFormat[] = ['text', 'json'];

function parseLogLevel(value: string | undefined): LogLevel | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (LOG_LEVELS.includes(lower as LogLevel)) {
    return lower as LogLevel;
  }
  return undefined;
}

function parseLogFormat(value: string | undefined): LogFormat | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (LOG_FORMATS.includes(lower as LogFormat)) {
    return lower as LogFormat;
  }
  return undefined;
}

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    return undefined;
  }
  return parsed;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    return undefined;
  }
  return parsed;
}

interface CliFlags {
  host?: string;
  port?: number;
  dataDir?: string;
  logLevel?: LogLevel;
  logFormat?: LogFormat;
  runnerPollInterval?: number;
  tempDir?: string;
}

export function parseCliFlags(args: string[]): CliFlags {
  const flags: CliFlags = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--host' && nextArg) {
      flags.host = nextArg;
      i++;
    } else if (arg === '--port' && nextArg) {
      const port = parsePort(nextArg);
      if (port !== undefined) flags.port = port;
      i++;
    } else if (arg === '--data-dir' && nextArg) {
      flags.dataDir = nextArg;
      i++;
    } else if (arg === '--log-level' && nextArg) {
      const level = parseLogLevel(nextArg);
      if (level !== undefined) flags.logLevel = level;
      i++;
    } else if (arg === '--log-format' && nextArg) {
      const format = parseLogFormat(nextArg);
      if (format !== undefined) flags.logFormat = format;
      i++;
    } else if (arg === '--runner-poll-interval' && nextArg) {
      const interval = parsePositiveInt(nextArg);
      if (interval !== undefined) flags.runnerPollInterval = interval;
      i++;
    } else if (arg === '--temp-dir' && nextArg) {
      flags.tempDir = nextArg;
      i++;
    }
  }

  return flags;
}

const DEFAULTS: Config = {
  host: '127.0.0.1',
  port: 3456,
  dataDir: join(homedir(), '.malamar'),
  logLevel: 'info',
  logFormat: 'text',
  runnerPollInterval: 1000,
  tempDir: tmpdir(),
};

export function loadConfig(argv: string[] = process.argv): Config {
  const cliFlags = parseCliFlags(argv.slice(2));

  return {
    host: cliFlags.host ?? process.env['MALAMAR_HOST'] ?? DEFAULTS.host,
    port: cliFlags.port ?? parsePort(process.env['MALAMAR_PORT']) ?? DEFAULTS.port,
    dataDir: cliFlags.dataDir ?? process.env['MALAMAR_DATA_DIR'] ?? DEFAULTS.dataDir,
    logLevel:
      cliFlags.logLevel ?? parseLogLevel(process.env['MALAMAR_LOG_LEVEL']) ?? DEFAULTS.logLevel,
    logFormat:
      cliFlags.logFormat ?? parseLogFormat(process.env['MALAMAR_LOG_FORMAT']) ?? DEFAULTS.logFormat,
    runnerPollInterval:
      cliFlags.runnerPollInterval ??
      parsePositiveInt(process.env['MALAMAR_RUNNER_POLL_INTERVAL']) ??
      DEFAULTS.runnerPollInterval,
    tempDir: cliFlags.tempDir ?? process.env['MALAMAR_TEMP_DIR'] ?? DEFAULTS.tempDir,
  };
}

// Singleton config instance
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}
