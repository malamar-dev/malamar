import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { initDb, resetDb } from '../core/database.ts';
import * as service from './service.ts';

describe('health service', () => {
  let db: Database;

  beforeEach(() => {
    resetDb();
    service.clearCliHealthCache();
    db = initDb(':memory:');
    // Run migrations
    const migration001 = readFileSync(
      join(process.cwd(), 'migrations/001_workspaces_agents.sql'),
      'utf-8'
    );
    db.exec(migration001);
  });

  afterEach(() => {
    db.close();
    resetDb();
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
