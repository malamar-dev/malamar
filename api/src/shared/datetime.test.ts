import { describe, expect, test } from 'bun:test';

import { formatRelative, isValidIsoDate, now, parseIsoDate } from './datetime.ts';

describe('now', () => {
  test('returns ISO timestamp string', () => {
    const timestamp = now();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  test('returns current time', () => {
    const before = Date.now();
    const timestamp = now();
    const after = Date.now();

    const parsed = new Date(timestamp).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });
});

describe('formatRelative', () => {
  test('formats just now', () => {
    const date = new Date();
    expect(formatRelative(date)).toBe('just now');
  });

  test('formats seconds as just now', () => {
    const date = new Date(Date.now() - 30 * 1000);
    expect(formatRelative(date)).toBe('just now');
  });

  test('formats minutes', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelative(date)).toBe('5 min ago');
  });

  test('formats single hour', () => {
    const date = new Date(Date.now() - 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('1 hour ago');
  });

  test('formats multiple hours', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('3 hours ago');
  });

  test('formats single day', () => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('1 day ago');
  });

  test('formats multiple days', () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('3 days ago');
  });

  test('formats single week', () => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('1 week ago');
  });

  test('formats multiple weeks', () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('2 weeks ago');
  });

  test('formats single month', () => {
    const date = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('1 month ago');
  });

  test('formats multiple months', () => {
    const date = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('3 months ago');
  });

  test('formats single year', () => {
    const date = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('1 year ago');
  });

  test('formats multiple years', () => {
    const date = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000);
    expect(formatRelative(date)).toBe('2 years ago');
  });

  test('handles string date input', () => {
    const isoString = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelative(isoString)).toBe('5 min ago');
  });

  test('handles future dates', () => {
    const date = new Date(Date.now() + 60 * 1000);
    expect(formatRelative(date)).toBe('in the future');
  });
});

describe('parseIsoDate', () => {
  test('parses valid ISO date', () => {
    const date = parseIsoDate('2024-01-15T10:30:00.000Z');
    expect(date.getUTCFullYear()).toBe(2024);
    expect(date.getUTCMonth()).toBe(0); // January is 0
    expect(date.getUTCDate()).toBe(15);
  });
});

describe('isValidIsoDate', () => {
  test('returns true for valid ISO date', () => {
    expect(isValidIsoDate('2024-01-15T10:30:00.000Z')).toBe(true);
  });

  test('returns true for date-only string', () => {
    expect(isValidIsoDate('2024-01-15')).toBe(true);
  });

  test('returns false for invalid date', () => {
    expect(isValidIsoDate('not-a-date')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isValidIsoDate('')).toBe(false);
  });
});
