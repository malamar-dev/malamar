import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { initDb, resetDb } from '../core/database.ts';
import * as service from './service.ts';

describe('settings service', () => {
  let db: Database;

  beforeEach(() => {
    resetDb();
    db = initDb(':memory:');
    // Run migrations
    const migration004 = readFileSync(join(process.cwd(), 'migrations/004_settings.sql'), 'utf-8');
    db.exec(migration004);
  });

  afterEach(() => {
    db.close();
    resetDb();
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
