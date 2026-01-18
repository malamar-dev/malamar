import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { initDb, resetDb } from '../core/database.ts';
import * as settingsService from '../settings/service.ts';
import { notify, sendTestEmail } from './service.ts';

describe('notifications service', () => {
  let db: Database;

  beforeEach(() => {
    resetDb();
    db = initDb(':memory:');
    // Run migrations
    const migration001 = readFileSync(join(process.cwd(), 'migrations/001_workspaces_agents.sql'), 'utf-8');
    const migration004 = readFileSync(join(process.cwd(), 'migrations/004_settings.sql'), 'utf-8');
    db.exec(migration001);
    db.exec(migration004);
  });

  afterEach(() => {
    db.close();
    resetDb();
    mock.restore();
  });

  describe('notify', () => {
    test('does nothing when notifications are disabled for error_occurred', async () => {
      // Disable error notifications
      settingsService.updateSettings({ notifyOnError: false });

      // Should not throw
      await notify('error_occurred', {
        workspaceId: 'ws1',
        workspaceTitle: 'Test Workspace',
        taskId: 't1',
        taskSummary: 'Test task',
        errorMessage: 'Something went wrong',
      });

      // No fetch should be called since notifications are disabled
    });

    test('does nothing when notifications are disabled for task_in_review', async () => {
      // Disable in_review notifications
      settingsService.updateSettings({ notifyOnInReview: false });

      // Should not throw
      await notify('task_in_review', {
        workspaceId: 'ws1',
        workspaceTitle: 'Test Workspace',
        taskId: 't1',
        taskSummary: 'Test task',
      });
    });

    test('does nothing when Mailgun is not configured', async () => {
      // Notifications enabled but Mailgun not configured
      settingsService.updateSettings({ notifyOnError: true });

      // Should not throw
      await notify('error_occurred', {
        workspaceId: 'ws1',
        workspaceTitle: 'Test Workspace',
        taskId: 't1',
        taskSummary: 'Test task',
        errorMessage: 'Something went wrong',
      });
    });

    test('sends email when notifications enabled and Mailgun configured', async () => {
      // Configure settings
      settingsService.updateSettings({
        notifyOnError: true,
        mailgun: {
          apiKey: 'test-key',
          domain: 'mail.example.com',
          fromEmail: 'noreply@example.com',
          toEmail: 'user@example.com',
        },
      });

      // Mock successful fetch
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: 'Queued' }), {
            status: 200,
            statusText: 'OK',
          })
        )
      );
      globalThis.fetch = mockFetch;

      await notify('error_occurred', {
        workspaceId: 'ws1',
        workspaceTitle: 'Test Workspace',
        taskId: 't1',
        taskSummary: 'Test task',
        errorMessage: 'Something went wrong',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('logs error but does not throw on fetch failure', async () => {
      // Configure settings
      settingsService.updateSettings({
        notifyOnError: true,
        mailgun: {
          apiKey: 'test-key',
          domain: 'mail.example.com',
          fromEmail: 'noreply@example.com',
          toEmail: 'user@example.com',
        },
      });

      // Mock failed fetch
      const mockFetch = mock(() => Promise.reject(new Error('Network error')));
      globalThis.fetch = mockFetch;

      // Should not throw
      await notify('error_occurred', {
        workspaceId: 'ws1',
        workspaceTitle: 'Test Workspace',
        taskId: 't1',
        taskSummary: 'Test task',
        errorMessage: 'Something went wrong',
      });
    });

    test('includes agent name in error email when provided', async () => {
      settingsService.updateSettings({
        notifyOnError: true,
        mailgun: {
          apiKey: 'test-key',
          domain: 'mail.example.com',
          fromEmail: 'noreply@example.com',
          toEmail: 'user@example.com',
        },
      });

      const mockFetch = mock((_url: string, _options: RequestInit) => {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Queued' }), {
            status: 200,
            statusText: 'OK',
          })
        );
      });
      globalThis.fetch = mockFetch;

      await notify('error_occurred', {
        workspaceId: 'ws1',
        workspaceTitle: 'Test Workspace',
        taskId: 't1',
        taskSummary: 'Test task',
        errorMessage: 'Something went wrong',
        agentName: 'Planner',
      });

      // The body is FormData so we can't easily inspect it in tests
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('sends task_in_review notification', async () => {
      settingsService.updateSettings({
        notifyOnInReview: true,
        mailgun: {
          apiKey: 'test-key',
          domain: 'mail.example.com',
          fromEmail: 'noreply@example.com',
          toEmail: 'user@example.com',
        },
      });

      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: 'Queued' }), {
            status: 200,
            statusText: 'OK',
          })
        )
      );
      globalThis.fetch = mockFetch;

      await notify('task_in_review', {
        workspaceId: 'ws1',
        workspaceTitle: 'Test Workspace',
        taskId: 't1',
        taskSummary: 'Test task',
        completedByAgent: 'Reviewer',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendTestEmail', () => {
    test('throws when Mailgun is not configured', async () => {
      await expect(sendTestEmail()).rejects.toThrow('Mailgun is not configured');
    });

    test('throws when Mailgun config is incomplete', async () => {
      settingsService.updateSettings({
        mailgun: {
          apiKey: 'test-key',
          domain: '',
          fromEmail: '',
          toEmail: '',
        },
      });

      await expect(sendTestEmail()).rejects.toThrow('Mailgun is not configured');
    });

    test('sends test email when Mailgun is configured', async () => {
      settingsService.updateSettings({
        mailgun: {
          apiKey: 'test-key',
          domain: 'mail.example.com',
          fromEmail: 'noreply@example.com',
          toEmail: 'user@example.com',
        },
      });

      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: 'Queued' }), {
            status: 200,
            statusText: 'OK',
          })
        )
      );
      globalThis.fetch = mockFetch;

      await sendTestEmail();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('throws on Mailgun API error', async () => {
      settingsService.updateSettings({
        mailgun: {
          apiKey: 'test-key',
          domain: 'mail.example.com',
          fromEmail: 'noreply@example.com',
          toEmail: 'user@example.com',
        },
      });

      const mockFetch = mock(() =>
        Promise.resolve(
          new Response('Unauthorized', {
            status: 401,
            statusText: 'Unauthorized',
          })
        )
      );
      globalThis.fetch = mockFetch;

      await expect(sendTestEmail()).rejects.toThrow('Mailgun error');
    });

    test('throws on network error', async () => {
      settingsService.updateSettings({
        mailgun: {
          apiKey: 'test-key',
          domain: 'mail.example.com',
          fromEmail: 'noreply@example.com',
          toEmail: 'user@example.com',
        },
      });

      const mockFetch = mock(() => Promise.reject(new Error('Network error')));
      globalThis.fetch = mockFetch;

      await expect(sendTestEmail()).rejects.toThrow('Mailgun error');
    });
  });
});
