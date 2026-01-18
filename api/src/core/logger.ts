import type { LogFormat, LogLevel } from './config.ts';
import { getConfig } from './config.ts';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(messageLevel: LogLevel, configLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[configLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatTextLog(level: LogLevel, message: string, context?: object): string {
  const timestamp = formatTimestamp();
  const levelUpper = level.toUpperCase().padEnd(5);
  let output = `[${timestamp}] [${levelUpper}] ${message}`;
  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`;
  }
  return output;
}

function formatJsonLog(level: LogLevel, message: string, context?: object): string {
  const logEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };
  return JSON.stringify(logEntry);
}

function formatLog(level: LogLevel, message: string, context?: object, format?: LogFormat): string {
  const logFormat = format ?? getConfig().logFormat;
  if (logFormat === 'json') {
    return formatJsonLog(level, message, context);
  }
  return formatTextLog(level, message, context);
}

function log(level: LogLevel, message: string, context?: object): void {
  const config = getConfig();
  if (!shouldLog(level, config.logLevel)) {
    return;
  }

  const formatted = formatLog(level, message, context, config.logFormat);

  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, context?: object): void => log('debug', message, context),
  info: (message: string, context?: object): void => log('info', message, context),
  warn: (message: string, context?: object): void => log('warn', message, context),
  error: (message: string, context?: object): void => log('error', message, context),
};

// Export for testing
export { formatJsonLog, formatTextLog, shouldLog };
