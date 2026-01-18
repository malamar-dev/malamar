import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { loadConfig, parseCliFlags, resetConfig } from './config.ts';

describe('parseCliFlags', () => {
  test('parses --host flag', () => {
    const flags = parseCliFlags(['--host', '0.0.0.0']);
    expect(flags.host).toBe('0.0.0.0');
  });

  test('parses --port flag', () => {
    const flags = parseCliFlags(['--port', '8080']);
    expect(flags.port).toBe(8080);
  });

  test('ignores invalid port', () => {
    const flags = parseCliFlags(['--port', 'invalid']);
    expect(flags.port).toBeUndefined();
  });

  test('ignores port out of range', () => {
    const flags = parseCliFlags(['--port', '99999']);
    expect(flags.port).toBeUndefined();
  });

  test('parses --data-dir flag', () => {
    const flags = parseCliFlags(['--data-dir', '/custom/path']);
    expect(flags.dataDir).toBe('/custom/path');
  });

  test('parses --log-level flag', () => {
    const flags = parseCliFlags(['--log-level', 'debug']);
    expect(flags.logLevel).toBe('debug');
  });

  test('ignores invalid log level', () => {
    const flags = parseCliFlags(['--log-level', 'invalid']);
    expect(flags.logLevel).toBeUndefined();
  });

  test('parses --log-format flag', () => {
    const flags = parseCliFlags(['--log-format', 'json']);
    expect(flags.logFormat).toBe('json');
  });

  test('parses --runner-poll-interval flag', () => {
    const flags = parseCliFlags(['--runner-poll-interval', '500']);
    expect(flags.runnerPollInterval).toBe(500);
  });

  test('parses --temp-dir flag', () => {
    const flags = parseCliFlags(['--temp-dir', '/tmp/custom']);
    expect(flags.tempDir).toBe('/tmp/custom');
  });

  test('parses multiple flags', () => {
    const flags = parseCliFlags(['--host', '0.0.0.0', '--port', '8080', '--log-level', 'warn']);
    expect(flags.host).toBe('0.0.0.0');
    expect(flags.port).toBe(8080);
    expect(flags.logLevel).toBe('warn');
  });
});

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfig();
    // Clear relevant env vars
    delete process.env['MALAMAR_HOST'];
    delete process.env['MALAMAR_PORT'];
    delete process.env['MALAMAR_DATA_DIR'];
    delete process.env['MALAMAR_LOG_LEVEL'];
    delete process.env['MALAMAR_LOG_FORMAT'];
    delete process.env['MALAMAR_RUNNER_POLL_INTERVAL'];
    delete process.env['MALAMAR_TEMP_DIR'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  test('uses defaults when no flags or env vars', () => {
    const config = loadConfig(['node', 'script.js']);
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3456);
    expect(config.logLevel).toBe('info');
    expect(config.logFormat).toBe('text');
    expect(config.runnerPollInterval).toBe(1000);
  });

  test('CLI flags override defaults', () => {
    const config = loadConfig(['node', 'script.js', '--host', '0.0.0.0', '--port', '8080']);
    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(8080);
  });

  test('env vars override defaults', () => {
    process.env['MALAMAR_HOST'] = '192.168.1.1';
    process.env['MALAMAR_PORT'] = '9000';
    const config = loadConfig(['node', 'script.js']);
    expect(config.host).toBe('192.168.1.1');
    expect(config.port).toBe(9000);
  });

  test('CLI flags take priority over env vars', () => {
    process.env['MALAMAR_HOST'] = '192.168.1.1';
    process.env['MALAMAR_PORT'] = '9000';
    const config = loadConfig(['node', 'script.js', '--host', '10.0.0.1', '--port', '3000']);
    expect(config.host).toBe('10.0.0.1');
    expect(config.port).toBe(3000);
  });

  test('handles all config options', () => {
    const config = loadConfig([
      'node',
      'script.js',
      '--host',
      'localhost',
      '--port',
      '4000',
      '--data-dir',
      '/data',
      '--log-level',
      'error',
      '--log-format',
      'json',
      '--runner-poll-interval',
      '2000',
      '--temp-dir',
      '/tmp/malamar',
    ]);
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(4000);
    expect(config.dataDir).toBe('/data');
    expect(config.logLevel).toBe('error');
    expect(config.logFormat).toBe('json');
    expect(config.runnerPollInterval).toBe(2000);
    expect(config.tempDir).toBe('/tmp/malamar');
  });
});
