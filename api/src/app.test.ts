import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { createApp } from './app.ts';
import { initDb, resetConfig, runMigrations } from './core/index.ts';

describe('app', () => {
  const testDataDir = join(tmpdir(), `malamar-app-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const testDbPath = join(testDataDir, 'test.db');

  beforeEach(() => {
    // Re-establish the singleton to point to our test database
    initDb(testDbPath);
    resetConfig();

    // Create test data directory
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });

    // Initialize test database
    initDb(testDbPath);
    runMigrations();
  });

  afterEach(() => {
    resetConfig();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  describe('createApp', () => {
    test('should create a Hono app', () => {
      const app = createApp();
      expect(app).toBeDefined();
      expect(app.fetch).toBeDefined();
      expect(typeof app.fetch).toBe('function');
    });

    test('should handle health check endpoint', async () => {
      const app = createApp();
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
    });

    test('should return 404 for unknown API routes', async () => {
      const app = createApp();
      const res = await app.request('/api/unknown');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    test('should return 404 for non-API routes', async () => {
      const app = createApp();
      const res = await app.request('/unknown');
      expect(res.status).toBe(404);
    });

    test('should handle workspace routes', async () => {
      const app = createApp();
      const res = await app.request('/api/workspaces');
      expect(res.status).toBe(200);
    });

    test('should handle settings routes', async () => {
      const app = createApp();
      const res = await app.request('/api/settings');
      expect(res.status).toBe(200);
    });

    test('should handle events routes', async () => {
      const app = createApp();
      const res = await app.request('/api/events/status');
      expect(res.status).toBe(200);
    });
  });

  describe('module exports', () => {
    test('should export createApp function', async () => {
      const module = await import('./app.ts');
      expect(module.createApp).toBeDefined();
      expect(typeof module.createApp).toBe('function');
    });
  });
});
