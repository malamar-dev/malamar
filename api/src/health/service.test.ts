import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { initDb, runMigrations } from '../core/database.ts';
import * as service from './service.ts';

let testDbPath: string | null = null;

function setupTestDb() {
  const testDir = join(tmpdir(), 'malamar-health-service-test');
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }
  testDbPath = join(testDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = initDb(testDbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  runMigrations(join(process.cwd(), 'migrations'), db);
  return db;
}

function cleanupTestDb() {
  if (testDbPath && existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true });
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (existsSync(walPath)) rmSync(walPath, { force: true });
    if (existsSync(shmPath)) rmSync(shmPath, { force: true });
  }
  testDbPath = null;
}

describe('health service', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  beforeEach(() => {
    // Re-establish the singleton to point to our test database
    initDb(testDbPath!);
    service.clearCliHealthCache();
  });

  describe('getOverallHealth', () => {
    test('returns health status', () => {
      const health = service.getOverallHealth();

      expect(health.status).toBe('ok');
      expect(health.version).toBe('0.1.0');
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.database.status).toBe('ok');
      expect(health.timestamp).toBeTruthy();
    });
  });

  describe('getCliHealth', () => {
    test('returns CLI health status for all CLIs', () => {
      const health = service.getCliHealth();

      expect(health.length).toBe(4); // claude, gemini, codex, opencode
      expect(health.every((h) => h.cliType)).toBe(true);
    });
  });

  describe('updateCliHealth', () => {
    test('updates CLI health status', () => {
      service.updateCliHealth('claude', {
        status: 'healthy',
        binaryPath: '/usr/bin/claude',
        version: '1.0.0',
      });

      const health = service.getCliHealthByType('claude');
      expect(health?.status).toBe('healthy');
      expect(health?.binaryPath).toBe('/usr/bin/claude');
      expect(health?.version).toBe('1.0.0');
    });
  });

  describe('hasHealthyCli', () => {
    test('returns false when no CLI is healthy', () => {
      expect(service.hasHealthyCli()).toBe(false);
    });

    test('returns true when a CLI is healthy', () => {
      service.updateCliHealth('claude', {
        status: 'healthy',
        binaryPath: '/usr/bin/claude',
      });
      expect(service.hasHealthyCli()).toBe(true);
    });
  });
});
