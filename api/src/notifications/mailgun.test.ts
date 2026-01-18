import { afterEach, describe, expect, mock, test } from 'bun:test';

import { buildEmailMessage, isMailgunConfigured, sendEmail } from './mailgun.ts';
import type { MailgunConfig } from './types.ts';

describe('mailgun', () => {
  const validConfig: MailgunConfig = {
    apiKey: 'test-api-key',
    domain: 'mail.example.com',
    fromEmail: 'noreply@example.com',
    toEmail: 'user@example.com',
  };

  afterEach(() => {
    mock.restore();
  });

  describe('isMailgunConfigured', () => {
    test('returns true when all fields are present', () => {
      expect(isMailgunConfigured(validConfig)).toBe(true);
    });

    test('returns false when config is null', () => {
      expect(isMailgunConfigured(null)).toBe(false);
    });

    test('returns false when config is undefined', () => {
      expect(isMailgunConfigured(undefined)).toBe(false);
    });

    test('returns false when apiKey is missing', () => {
      const config = { ...validConfig, apiKey: '' };
      expect(isMailgunConfigured(config)).toBe(false);
    });

    test('returns false when domain is missing', () => {
      const config = { ...validConfig, domain: '' };
      expect(isMailgunConfigured(config)).toBe(false);
    });

    test('returns false when fromEmail is missing', () => {
      const config = { ...validConfig, fromEmail: '' };
      expect(isMailgunConfigured(config)).toBe(false);
    });

    test('returns false when toEmail is missing', () => {
      const config = { ...validConfig, toEmail: '' };
      expect(isMailgunConfigured(config)).toBe(false);
    });

    test('returns false when partial config is provided', () => {
      expect(isMailgunConfigured({ apiKey: 'key' })).toBe(false);
      expect(isMailgunConfigured({ apiKey: 'key', domain: 'domain' })).toBe(false);
    });
  });

  describe('buildEmailMessage', () => {
    test('builds email message from config', () => {
      const message = buildEmailMessage(validConfig, 'Test Subject', 'Test body content');

      expect(message).toEqual({
        from: 'noreply@example.com',
        to: 'user@example.com',
        subject: 'Test Subject',
        text: 'Test body content',
      });
    });

    test('handles empty subject and text', () => {
      const message = buildEmailMessage(validConfig, '', '');

      expect(message.subject).toBe('');
      expect(message.text).toBe('');
    });

    test('handles special characters in subject and text', () => {
      const subject = 'Alert: Error in "Task" <important>';
      const text = 'Error occurred:\n- Line 1\n- Line 2\n\nRegards,\nSystem';

      const message = buildEmailMessage(validConfig, subject, text);

      expect(message.subject).toBe(subject);
      expect(message.text).toBe(text);
    });
  });

  describe('sendEmail', () => {
    test('sends email successfully', async () => {
      // Mock successful fetch response
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: 'Queued' }), {
            status: 200,
            statusText: 'OK',
          })
        )
      );
      globalThis.fetch = mockFetch;

      const message = buildEmailMessage(validConfig, 'Test', 'Test body');
      const result = await sendEmail(validConfig, message);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('returns error on HTTP error response', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response('Unauthorized', {
            status: 401,
            statusText: 'Unauthorized',
          })
        )
      );
      globalThis.fetch = mockFetch;

      const message = buildEmailMessage(validConfig, 'Test', 'Test body');
      const result = await sendEmail(validConfig, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mailgun error');
      expect(result.error).toContain('401');
    });

    test('returns error on network failure', async () => {
      const mockFetch = mock(() => Promise.reject(new Error('Network error')));
      globalThis.fetch = mockFetch;

      const message = buildEmailMessage(validConfig, 'Test', 'Test body');
      const result = await sendEmail(validConfig, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mailgun error');
      expect(result.error).toContain('Network error');
    });

    test('returns error on non-Error throw', async () => {
      const mockFetch = mock(() => Promise.reject('String error'));
      globalThis.fetch = mockFetch;

      const message = buildEmailMessage(validConfig, 'Test', 'Test body');
      const result = await sendEmail(validConfig, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });

    test('sends correct request format', async () => {
      let capturedUrl: string | undefined;
      let capturedOptions: RequestInit | undefined;

      const mockFetch = mock((url: string, options: RequestInit) => {
        capturedUrl = url;
        capturedOptions = options;
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Queued' }), {
            status: 200,
            statusText: 'OK',
          })
        );
      });
      globalThis.fetch = mockFetch;

      const message = buildEmailMessage(validConfig, 'Subject', 'Body');
      await sendEmail(validConfig, message);

      expect(capturedUrl).toBe('https://api.mailgun.net/v3/mail.example.com/messages');
      expect(capturedOptions?.method).toBe('POST');
      expect(capturedOptions?.headers).toHaveProperty('Authorization');

      // Check auth header format (Basic base64)
      const authHeader = (capturedOptions?.headers as Record<string, string>)['Authorization'];
      expect(authHeader).toStartWith('Basic ');
    });

    test('handles 500 server error', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response('Internal Server Error', {
            status: 500,
            statusText: 'Internal Server Error',
          })
        )
      );
      globalThis.fetch = mockFetch;

      const message = buildEmailMessage(validConfig, 'Test', 'Test body');
      const result = await sendEmail(validConfig, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    test('handles rate limit error', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response('Rate limit exceeded', {
            status: 429,
            statusText: 'Too Many Requests',
          })
        )
      );
      globalThis.fetch = mockFetch;

      const message = buildEmailMessage(validConfig, 'Test', 'Test body');
      const result = await sendEmail(validConfig, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('429');
    });
  });
});
