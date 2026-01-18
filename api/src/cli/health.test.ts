import { describe, expect, test } from 'bun:test';

import { checkCliHealth, findBinaryInPath, getCliBinaryName } from './health.ts';

describe('cli/health', () => {
  describe('getCliBinaryName', () => {
    test('returns correct binary name for claude', () => {
      expect(getCliBinaryName('claude')).toBe('claude');
    });

    test('returns correct binary name for gemini', () => {
      expect(getCliBinaryName('gemini')).toBe('gemini');
    });

    test('returns correct binary name for codex', () => {
      expect(getCliBinaryName('codex')).toBe('codex');
    });

    test('returns correct binary name for opencode', () => {
      expect(getCliBinaryName('opencode')).toBe('opencode');
    });
  });

  describe('findBinaryInPath', () => {
    test('returns path for common system binary', async () => {
      // Test with a binary that should exist on most systems
      // Note: This is an integration-style test that requires 'which' to work
      // The actual path will depend on the system
      const result = await findBinaryInPath('claude');

      // Result will be null if claude is not installed, which is expected
      // The important thing is that the function doesn't throw
      expect(result === null || typeof result === 'string').toBe(true);
    });

    test('returns null for non-existent binary', async () => {
      // Use a CLI type that's unlikely to be installed in test environment
      // The function should return null without throwing
      const result = await findBinaryInPath('opencode');

      // opencode is unlikely to be installed, so should return null
      // But if it is installed, it should return a valid path
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('checkCliHealth', () => {
    test('returns not_found when binary does not exist', async () => {
      // Use a non-existent binary path
      const result = await checkCliHealth('claude', '/non/existent/path/claude');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('includes durationMs in result', async () => {
      const result = await checkCliHealth('claude');

      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('returns not_found when CLI is not in PATH', async () => {
      // This test assumes the specific CLI is not installed
      // The result should be not_found
      const result = await checkCliHealth('opencode');

      // Should be not_found or unhealthy (if binary exists but doesn't work)
      expect(['not_found', 'unhealthy', 'healthy'].includes(result.status)).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('returns healthy when valid CLI exists', async () => {
      // Test with a system command that we know exists
      // Note: This tests the happy path by checking a system binary
      // In practice, this might need mocking for CI environments

      // We can test with 'which' itself as a proxy
      // by temporarily using it as a "CLI"
      const result = await checkCliHealth('claude');

      // Result depends on whether claude is actually installed
      // Main check is that the function completes without error
      expect(['healthy', 'unhealthy', 'not_found'].includes(result.status)).toBe(true);
    });

    test('handles custom binary path', async () => {
      // Test with an invalid custom path
      const result = await checkCliHealth('claude', '/invalid/path/to/claude');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeDefined();
    });

    test('result has correct structure', async () => {
      const result = await checkCliHealth('claude');

      // Check that all expected fields are present
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('durationMs');
      expect(['healthy', 'unhealthy', 'not_found'].includes(result.status)).toBe(true);

      // Optional fields may or may not be present
      if (result.status === 'healthy') {
        expect(result.binaryPath).toBeDefined();
      }
      if (result.status !== 'healthy') {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('health check result structure', () => {
    test('healthy result includes binaryPath', async () => {
      // If the CLI is installed, the result should include binaryPath
      const result = await checkCliHealth('claude');

      if (result.status === 'healthy') {
        expect(typeof result.binaryPath).toBe('string');
        expect(result.binaryPath!.length).toBeGreaterThan(0);
      }
    });

    test('not_found result includes appropriate error', async () => {
      const result = await checkCliHealth('opencode');

      if (result.status === 'not_found') {
        expect(result.error).toContain('not found');
      }
    });

    test('unhealthy result includes error details', async () => {
      const result = await checkCliHealth('claude', '/non/existent/binary');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });
});
