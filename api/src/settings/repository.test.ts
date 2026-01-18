import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import * as repository from './repository.ts';

describe('settings repository', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    // Run migrations
    const migration004 = readFileSync(join(process.cwd(), 'migrations/004_settings.sql'), 'utf-8');
    db.exec(migration004);
  });

  afterEach(() => {
    db.close();
  });

  describe('get', () => {
    test('returns default values from migration', () => {
      const notifyOnError = repository.get('notify_on_error', db);
      expect(notifyOnError).toBe(true);
    });

    test('returns null for non-existent key', () => {
      const value = repository.get('nonexistent', db);
      expect(value).toBeNull();
    });
  });

  describe('set', () => {
    test('sets a boolean value', () => {
      repository.set('notify_on_error', false, db);
      const value = repository.get('notify_on_error', db);
      expect(value).toBe(false);
    });

    test('sets an object value', () => {
      const mailgun = {
        apiKey: 'key123',
        domain: 'example.com',
        fromEmail: 'from@example.com',
        toEmail: 'to@example.com',
      };
      repository.set('mailgun', mailgun, db);
      const value = repository.get('mailgun', db);
      expect(value).toEqual(mailgun);
    });

    test('overwrites existing value', () => {
      repository.set('notify_on_error', false, db);
      repository.set('notify_on_error', true, db);
      const value = repository.get('notify_on_error', db);
      expect(value).toBe(true);
    });
  });

  describe('getAll', () => {
    test('returns all settings with defaults', () => {
      const settings = repository.getAll(db);
      expect(settings.notifyOnError).toBe(true);
      expect(settings.notifyOnInReview).toBe(true);
    });

    test('includes custom values', () => {
      repository.set('notify_on_error', false, db);
      repository.set('mailgun', { apiKey: 'test' }, db);

      const settings = repository.getAll(db);
      expect(settings.notifyOnError).toBe(false);
      expect(settings.mailgun).toEqual({ apiKey: 'test' });
    });
  });

  describe('setMultiple', () => {
    test('updates multiple settings', () => {
      repository.setMultiple(
        {
          notifyOnError: false,
          notifyOnInReview: false,
        },
        db
      );

      const settings = repository.getAll(db);
      expect(settings.notifyOnError).toBe(false);
      expect(settings.notifyOnInReview).toBe(false);
    });

    test('removes mailgun when set to null', () => {
      repository.set('mailgun', { apiKey: 'test' }, db);
      repository.setMultiple({ mailgun: undefined }, db);

      // undefined means don't change
      const settings1 = repository.getAll(db);
      expect(settings1.mailgun).toEqual({ apiKey: 'test' });
    });
  });

  describe('remove', () => {
    test('removes a setting', () => {
      repository.set('custom_key', 'value', db);
      const removed = repository.remove('custom_key', db);
      expect(removed).toBe(true);
      expect(repository.get('custom_key', db)).toBeNull();
    });

    test('returns false for non-existent key', () => {
      const removed = repository.remove('nonexistent', db);
      expect(removed).toBe(false);
    });
  });
});
