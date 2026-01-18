import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { getConfig, resetConfig } from '../core/index.ts';
import { formatConfig } from './config.ts';

describe('config command', () => {
  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    resetConfig();
  });

  describe('formatConfig', () => {
    test('should format config as string', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
    });

    test('should include header', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain('Current Configuration:');
    });

    test('should include host', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain(`Host:`);
      expect(output).toContain(cfg.host);
    });

    test('should include port', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain(`Port:`);
      expect(output).toContain(String(cfg.port));
    });

    test('should include data directory', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain(`Data Directory:`);
      expect(output).toContain(cfg.dataDir);
    });

    test('should include log level', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain(`Log Level:`);
      expect(output).toContain(cfg.logLevel);
    });

    test('should include log format', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain(`Log Format:`);
      expect(output).toContain(cfg.logFormat);
    });

    test('should include runner poll interval', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain(`Runner Poll Interval:`);
      expect(output).toContain(`${cfg.runnerPollInterval}ms`);
    });

    test('should include temp directory', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain(`Temp Directory:`);
      expect(output).toContain(cfg.tempDir);
    });

    test('should include environment variables section', () => {
      const cfg = getConfig();
      const output = formatConfig(cfg);
      expect(output).toContain('Environment Variables:');
      expect(output).toContain('MALAMAR_HOST=');
      expect(output).toContain('MALAMAR_PORT=');
      expect(output).toContain('MALAMAR_DATA_DIR=');
    });
  });

  describe('module exports', () => {
    test('should export config function', async () => {
      const module = await import('./config.ts');
      expect(module.config).toBeDefined();
      expect(typeof module.config).toBe('function');
    });

    test('should export formatConfig function', async () => {
      const module = await import('./config.ts');
      expect(module.formatConfig).toBeDefined();
      expect(typeof module.formatConfig).toBe('function');
    });
  });
});
