import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { closeDb, initDb, resetDb, runMigrations } from '../core/database.ts';
import * as service from './service.ts';

let testDbPath: string | null = null;

function setupTestDb() {
  const testDir = join(tmpdir(), 'malamar-settings-service-test');
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
  closeDb();
  resetDb();
  if (testDbPath && existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true });
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (existsSync(walPath)) rmSync(walPath, { force: true });
    if (existsSync(shmPath)) rmSync(shmPath, { force: true });
  }
  testDbPath = null;
}

function clearTables() {
  const db = initDb(testDbPath!);
  db.exec('DELETE FROM settings');
}

describe('settings service', () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  beforeEach(() => {
    // Re-establish the singleton to point to our test database
    initDb(testDbPath!);
    clearTables();
  });

  describe('getSettings', () => {
    test('returns all settings', () => {
      const settings = service.getSettings();
      expect(settings.notifyOnError).toBe(true);
      expect(settings.notifyOnInReview).toBe(true);
    });
  });

  describe('updateSettings', () => {
    test('updates settings and returns new values', () => {
      const updated = service.updateSettings({ notifyOnError: false });
      expect(updated.notifyOnError).toBe(false);
    });
  });

  describe('getMailgunSettings', () => {
    test('returns null when not configured', () => {
      const mailgun = service.getMailgunSettings();
      expect(mailgun).toBeNull();
    });

    test('returns mailgun settings when configured', () => {
      service.updateSettings({
        mailgun: {
          apiKey: 'key',
          domain: 'example.com',
          fromEmail: 'from@example.com',
          toEmail: 'to@example.com',
        },
      });
      const mailgun = service.getMailgunSettings();
      expect(mailgun?.apiKey).toBe('key');
    });
  });

  describe('getCliSettings', () => {
    test('returns null when not configured', () => {
      const cli = service.getCliSettings('claude');
      expect(cli).toBeNull();
    });

    test('returns CLI settings when configured', () => {
      service.updateSettings({
        cli: {
          claude: { enabled: true, binaryPath: '/usr/bin/claude' },
        },
      });
      const cli = service.getCliSettings('claude');
      expect(cli?.enabled).toBe(true);
      expect(cli?.binaryPath).toBe('/usr/bin/claude');
    });
  });

  describe('isMailgunConfigured', () => {
    test('returns false when not configured', () => {
      expect(service.isMailgunConfigured()).toBe(false);
    });

    test('returns false when partially configured', () => {
      service.updateSettings({
        mailgun: {
          apiKey: 'key',
          domain: '',
          fromEmail: '',
          toEmail: '',
        },
      });
      expect(service.isMailgunConfigured()).toBe(false);
    });

    test('returns true when fully configured', () => {
      service.updateSettings({
        mailgun: {
          apiKey: 'key',
          domain: 'example.com',
          fromEmail: 'from@example.com',
          toEmail: 'to@example.com',
        },
      });
      expect(service.isMailgunConfigured()).toBe(true);
    });
  });
});
