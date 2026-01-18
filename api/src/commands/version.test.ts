import { describe, expect, test } from 'bun:test';

import { getVersion } from './version.ts';

describe('version command', () => {
  describe('getVersion', () => {
    test('should return a version string', () => {
      const version = getVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });

    test('should return version in expected format', () => {
      const version = getVersion();
      // Version should be either a semver-like string or 'unknown'
      expect(version === 'unknown' || /^\d+\.\d+\.\d+/.test(version)).toBe(true);
    });
  });

  describe('module exports', () => {
    test('should export version function', async () => {
      const module = await import('./version.ts');
      expect(module.version).toBeDefined();
      expect(typeof module.version).toBe('function');
    });

    test('should export getVersion function', async () => {
      const module = await import('./version.ts');
      expect(module.getVersion).toBeDefined();
      expect(typeof module.getVersion).toBe('function');
    });
  });
});
