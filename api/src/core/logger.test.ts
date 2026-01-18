import { describe, expect, test } from 'bun:test';

import { formatJsonLog, formatTextLog, shouldLog } from './logger.ts';

describe('shouldLog', () => {
  test('debug shows when config is debug', () => {
    expect(shouldLog('debug', 'debug')).toBe(true);
  });

  test('debug hidden when config is info', () => {
    expect(shouldLog('debug', 'info')).toBe(false);
  });

  test('info shows when config is info', () => {
    expect(shouldLog('info', 'info')).toBe(true);
  });

  test('info shows when config is debug', () => {
    expect(shouldLog('info', 'debug')).toBe(true);
  });

  test('warn shows when config is warn', () => {
    expect(shouldLog('warn', 'warn')).toBe(true);
  });

  test('warn hidden when config is error', () => {
    expect(shouldLog('warn', 'error')).toBe(false);
  });

  test('error always shows', () => {
    expect(shouldLog('error', 'debug')).toBe(true);
    expect(shouldLog('error', 'info')).toBe(true);
    expect(shouldLog('error', 'warn')).toBe(true);
    expect(shouldLog('error', 'error')).toBe(true);
  });
});

describe('formatTextLog', () => {
  test('formats message without context', () => {
    const output = formatTextLog('info', 'Hello world');
    expect(output).toMatch(
      /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[INFO \] Hello world$/
    );
  });

  test('formats message with context', () => {
    const output = formatTextLog('error', 'Something failed', { error: 'test' });
    expect(output).toMatch(/^\[.*\] \[ERROR\] Something failed \{"error":"test"\}$/);
  });

  test('formats different log levels', () => {
    expect(formatTextLog('debug', 'test')).toContain('[DEBUG]');
    expect(formatTextLog('info', 'test')).toContain('[INFO ]');
    expect(formatTextLog('warn', 'test')).toContain('[WARN ]');
    expect(formatTextLog('error', 'test')).toContain('[ERROR]');
  });

  test('ignores empty context object', () => {
    const output = formatTextLog('info', 'test', {});
    expect(output).not.toContain('{}');
  });
});

describe('formatJsonLog', () => {
  test('formats message without context', () => {
    const output = formatJsonLog('info', 'Hello world');
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('Hello world');
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    expect(parsed.context).toBeUndefined();
  });

  test('formats message with context', () => {
    const output = formatJsonLog('error', 'Failed', { code: 500, details: 'oops' });
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('Failed');
    expect(parsed.context).toEqual({ code: 500, details: 'oops' });
  });

  test('ignores empty context object', () => {
    const output = formatJsonLog('info', 'test', {});
    const parsed = JSON.parse(output);
    expect(parsed.context).toBeUndefined();
  });
});
