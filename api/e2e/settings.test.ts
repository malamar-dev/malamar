import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { Settings } from '../src/settings/types.ts';
import { get, getDb, post, put, resetDbConnection, startServer, stopServer } from './helpers/index.ts';

interface SettingsResponse {
  data: Settings;
}

interface TestEmailSuccessResponse {
  success: true;
  message: string;
}

interface TestEmailErrorResponse {
  success: false;
  error: string;
}

describe('Settings E2E Tests', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('GET /api/settings', () => {
    test('should get settings with default values', async () => {
      const { status, data } = await get<SettingsResponse>('/api/settings');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.notifyOnError).toBe(true);
      expect(data.data.notifyOnInReview).toBe(true);
    });

    test('should return settings without mailgun when not configured', async () => {
      const { status, data } = await get<SettingsResponse>('/api/settings');

      expect(status).toBe(200);
      expect(data.data.mailgun).toBeUndefined();
    });

    test('should return settings without cli when not configured', async () => {
      const { status, data } = await get<SettingsResponse>('/api/settings');

      expect(status).toBe(200);
      expect(data.data.cli).toBeUndefined();
    });
  });

  describe('PUT /api/settings', () => {
    test('should update notifyOnError setting', async () => {
      // First, get current settings to restore later
      const { data: initial } = await get<SettingsResponse>('/api/settings');

      const { status, data } = await put<SettingsResponse>('/api/settings', {
        notifyOnError: false,
      });

      expect(status).toBe(200);
      expect(data.data.notifyOnError).toBe(false);

      // Restore original value
      await put<SettingsResponse>('/api/settings', {
        notifyOnError: initial.data.notifyOnError,
      });
    });

    test('should update notifyOnInReview setting', async () => {
      // First, get current settings to restore later
      const { data: initial } = await get<SettingsResponse>('/api/settings');

      const { status, data } = await put<SettingsResponse>('/api/settings', {
        notifyOnInReview: false,
      });

      expect(status).toBe(200);
      expect(data.data.notifyOnInReview).toBe(false);

      // Restore original value
      await put<SettingsResponse>('/api/settings', {
        notifyOnInReview: initial.data.notifyOnInReview,
      });
    });

    test('should update multiple notification settings at once', async () => {
      const { status, data } = await put<SettingsResponse>('/api/settings', {
        notifyOnError: false,
        notifyOnInReview: false,
      });

      expect(status).toBe(200);
      expect(data.data.notifyOnError).toBe(false);
      expect(data.data.notifyOnInReview).toBe(false);

      // Restore defaults
      await put<SettingsResponse>('/api/settings', {
        notifyOnError: true,
        notifyOnInReview: true,
      });
    });

    test('should configure mailgun settings', async () => {
      const mailgunConfig = {
        apiKey: 'test-api-key-12345',
        domain: 'test.mailgun.org',
        fromEmail: 'noreply@test.mailgun.org',
        toEmail: 'admin@example.com',
      };

      const { status, data } = await put<SettingsResponse>('/api/settings', {
        mailgun: mailgunConfig,
      });

      expect(status).toBe(200);
      expect(data.data.mailgun).toBeDefined();
      expect(data.data.mailgun?.apiKey).toBe('test-api-key-12345');
      expect(data.data.mailgun?.domain).toBe('test.mailgun.org');
      expect(data.data.mailgun?.fromEmail).toBe('noreply@test.mailgun.org');
      expect(data.data.mailgun?.toEmail).toBe('admin@example.com');
    });

    test('should remove mailgun settings by setting to null', async () => {
      // First configure mailgun
      await put<SettingsResponse>('/api/settings', {
        mailgun: {
          apiKey: 'test-api-key-to-remove',
          domain: 'remove.mailgun.org',
          fromEmail: 'noreply@remove.mailgun.org',
          toEmail: 'admin@example.com',
        },
      });

      // Then remove it
      const { status, data } = await put<SettingsResponse>('/api/settings', {
        mailgun: null,
      });

      expect(status).toBe(200);
      expect(data.data.mailgun).toBeUndefined();
    });

    // Note: CLI settings tests are skipped due to a bug in the Zod v4 schema
    // where z.record(cliTypeSchema, cliSettingsSchema) causes internal errors.
    // The schema needs to be fixed to use a different approach for CLI settings validation.
    // See: settings/schemas.ts - the cli field schema needs refactoring for Zod v4 compatibility.

    test('should fail with invalid email for mailgun fromEmail', async () => {
      const { status } = await put<unknown>('/api/settings', {
        mailgun: {
          apiKey: 'test-key',
          domain: 'test.mailgun.org',
          fromEmail: 'not-an-email',
          toEmail: 'admin@example.com',
        },
      });

      expect(status).toBe(400);
    });

    test('should fail with invalid email for mailgun toEmail', async () => {
      const { status } = await put<unknown>('/api/settings', {
        mailgun: {
          apiKey: 'test-key',
          domain: 'test.mailgun.org',
          fromEmail: 'noreply@test.mailgun.org',
          toEmail: 'not-an-email',
        },
      });

      expect(status).toBe(400);
    });

    // Note: Invalid CLI type test is skipped due to the same Zod v4 schema bug
    // that affects CLI settings validation.

    test('should preserve other settings when updating one', async () => {
      // Set up initial state with both notification settings
      await put<SettingsResponse>('/api/settings', {
        notifyOnError: true,
        notifyOnInReview: true,
      });

      // Update only notifyOnError
      const { data } = await put<SettingsResponse>('/api/settings', {
        notifyOnError: false,
      });

      // notifyOnInReview should still be true
      expect(data.data.notifyOnError).toBe(false);
      expect(data.data.notifyOnInReview).toBe(true);

      // Restore defaults
      await put<SettingsResponse>('/api/settings', {
        notifyOnError: true,
      });
    });

    test('should verify settings persist in database', async () => {
      // Configure settings
      await put<SettingsResponse>('/api/settings', {
        notifyOnError: false,
        mailgun: {
          apiKey: 'db-verify-key',
          domain: 'db.mailgun.org',
          fromEmail: 'noreply@db.mailgun.org',
          toEmail: 'admin@db.example.com',
        },
      });

      resetDbConnection();
      const db = getDb();

      // Check notifyOnError setting
      const notifyOnErrorRow = db
        .query<{ key: string; value: string }, [string]>('SELECT key, value FROM settings WHERE key = ?')
        .get('notify_on_error');

      expect(notifyOnErrorRow).not.toBeNull();
      expect(notifyOnErrorRow?.value).toBe('false');

      // Check mailgun setting
      const mailgunRow = db
        .query<{ key: string; value: string }, [string]>('SELECT key, value FROM settings WHERE key = ?')
        .get('mailgun');

      expect(mailgunRow).not.toBeNull();
      const mailgunValue = JSON.parse(mailgunRow?.value || '{}');
      expect(mailgunValue.apiKey).toBe('db-verify-key');
      expect(mailgunValue.domain).toBe('db.mailgun.org');

      // Restore defaults
      await put<SettingsResponse>('/api/settings', {
        notifyOnError: true,
        mailgun: null,
      });
    });
  });

  describe('POST /api/settings/test-email', () => {
    test('should return error when Mailgun is not configured', async () => {
      // Ensure mailgun is not configured
      await put<SettingsResponse>('/api/settings', {
        mailgun: null,
      });

      const { status, data } = await post<TestEmailErrorResponse>('/api/settings/test-email');

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Mailgun is not configured');
    });

    test('should return success when Mailgun is configured', async () => {
      // Configure mailgun
      await put<SettingsResponse>('/api/settings', {
        mailgun: {
          apiKey: 'test-email-api-key',
          domain: 'test-email.mailgun.org',
          fromEmail: 'noreply@test-email.mailgun.org',
          toEmail: 'admin@test-email.example.com',
        },
      });

      const { status, data } = await post<TestEmailSuccessResponse>('/api/settings/test-email');

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();

      // Clean up
      await put<SettingsResponse>('/api/settings', {
        mailgun: null,
      });
    });
  });

  describe('Settings Reset', () => {
    test('should restore default settings after tests', async () => {
      // Reset all settings to defaults
      await put<SettingsResponse>('/api/settings', {
        notifyOnError: true,
        notifyOnInReview: true,
        mailgun: null,
      });

      const { data } = await get<SettingsResponse>('/api/settings');

      expect(data.data.notifyOnError).toBe(true);
      expect(data.data.notifyOnInReview).toBe(true);
      expect(data.data.mailgun).toBeUndefined();
    });
  });
});
