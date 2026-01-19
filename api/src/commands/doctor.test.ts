import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { resetConfig } from '../core/index.ts';
import { clearHealthStatus } from '../jobs/health-check.ts';
import { runDoctor } from './doctor.ts';

describe('doctor command', () => {
  const testDataDir = join(tmpdir(), `malamar-doctor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  beforeEach(() => {
    // Reset any global state
    resetConfig();
    clearHealthStatus();

    // Create test data directory
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test data directory
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    resetConfig();
    clearHealthStatus();
  });

  describe('runDoctor', () => {
    test('should return a doctor result', async () => {
      const result = await runDoctor();
      expect(result).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(Array.isArray(result.checks)).toBe(true);
      expect(typeof result.passed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.warnings).toBe('number');
    });

    test('should check data directory', async () => {
      const result = await runDoctor();
      const dataCheck = result.checks.find((c) => c.name === 'Data directory');
      expect(dataCheck).toBeDefined();
    });

    test('should check database', async () => {
      const result = await runDoctor();
      const dbCheck = result.checks.find((c) => c.name === 'Database');
      expect(dbCheck).toBeDefined();
    });

    test('should check migrations', async () => {
      const result = await runDoctor();
      const migrationCheck = result.checks.find((c) => c.name === 'Migrations');
      expect(migrationCheck).toBeDefined();
    });

    test('should check configuration', async () => {
      const result = await runDoctor();
      const configCheck = result.checks.find((c) => c.name === 'Configuration');
      expect(configCheck).toBeDefined();
      // With default config, this should pass
      expect(configCheck?.status).toBe('pass');
    });

    test('should check CLI health', async () => {
      const result = await runDoctor();
      // Should have at least one CLI check
      const cliChecks = result.checks.filter((c) => c.name.startsWith('CLI:'));
      expect(cliChecks.length).toBeGreaterThan(0);
    });

    test('should count results correctly', async () => {
      const result = await runDoctor();
      const passCount = result.checks.filter((c) => c.status === 'pass').length;
      const failCount = result.checks.filter((c) => c.status === 'fail').length;
      const warnCount = result.checks.filter((c) => c.status === 'warn').length;

      expect(result.passed).toBe(passCount);
      expect(result.failed).toBe(failCount);
      expect(result.warnings).toBe(warnCount);
    });
  });

  describe('CheckResult type', () => {
    test('should have valid status values', async () => {
      const result = await runDoctor();
      for (const check of result.checks) {
        expect(['pass', 'fail', 'warn']).toContain(check.status);
      }
    });
  });

  describe('module exports', () => {
    test('should export doctor function', async () => {
      const module = await import('./doctor.ts');
      expect(module.doctor).toBeDefined();
      expect(typeof module.doctor).toBe('function');
    });

    test('should export runDoctor function', async () => {
      const module = await import('./doctor.ts');
      expect(module.runDoctor).toBeDefined();
      expect(typeof module.runDoctor).toBe('function');
    });
  });
});
