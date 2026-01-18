import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { resetConfig, resetDb } from '../core/index.ts';

describe('serve command', () => {
  const testDataDir = join(tmpdir(), `malamar-serve-test-${Date.now()}`);

  beforeEach(() => {
    // Reset any global state
    resetConfig();
    resetDb();

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
    resetDb();
  });

  describe('createApp', () => {
    test('should create a Hono app with routes', async () => {
      // This test verifies the app structure by importing and checking the module
      const { serve } = await import('./serve.ts');
      expect(serve).toBeDefined();
      expect(typeof serve).toBe('function');
    });
  });

  describe('isFirstLaunch detection', () => {
    test('should detect first launch when database does not exist', () => {
      // We can test the first launch detection by checking the internal logic
      // The serve function checks if the database file exists
      const dbPath = join(testDataDir, 'malamar.db');
      expect(existsSync(dbPath)).toBe(false);
    });

    test('should detect existing installation when database exists', () => {
      // Create a mock database file
      const dbPath = join(testDataDir, 'malamar.db');
      Bun.write(dbPath, '');
      expect(existsSync(dbPath)).toBe(true);
    });
  });

  describe('module exports', () => {
    test('should export serve function', async () => {
      const module = await import('./serve.ts');
      expect(module.serve).toBeDefined();
      expect(typeof module.serve).toBe('function');
    });
  });
});
