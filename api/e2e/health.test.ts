import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { CliType } from '../src/core/types.ts';
import { CLI_TYPES } from '../src/core/types.ts';
import type { CliHealthStatus, HealthStatus } from '../src/health/types.ts';
import { get, post, startServer, stopServer, TEST_DATA_DIR } from './helpers/index.ts';

interface HealthResponse {
  data: HealthStatus;
}

interface CliHealthResponse {
  data: CliHealthStatus[];
}

describe('Health E2E Tests', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('GET /api/health', () => {
    test('should return overall health status', async () => {
      const { status, data } = await get<HealthResponse>('/api/health');

      expect(status).toBe(200);
      expect(data.data.status).toBe('ok');
      expect(data.data.version).toBeDefined();
      expect(typeof data.data.uptime).toBe('number');
      expect(data.data.uptime).toBeGreaterThanOrEqual(0);
      expect(data.data.timestamp).toBeDefined();
    });

    test('should include database health information', async () => {
      const { status, data } = await get<HealthResponse>('/api/health');

      expect(status).toBe(200);
      expect(data.data.database).toBeDefined();
      expect(data.data.database.status).toBe('ok');
      expect(data.data.database.path).toContain(TEST_DATA_DIR);
      expect(data.data.database.path).toContain('malamar.db');
    });

    test('should not include error field when database is healthy', async () => {
      const { data } = await get<HealthResponse>('/api/health');

      expect(data.data.database.status).toBe('ok');
      expect(data.data.database.error).toBeUndefined();
    });

    test('should return version in expected format', async () => {
      const { data } = await get<HealthResponse>('/api/health');

      // Version should be a semver-like string
      expect(data.data.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test('should return valid ISO timestamp', async () => {
      const { data } = await get<HealthResponse>('/api/health');

      // Verify timestamp is a valid ISO string
      const timestamp = new Date(data.data.timestamp);
      expect(timestamp.toISOString()).toBe(data.data.timestamp);
    });

    test('should have increasing uptime on subsequent calls', async () => {
      const { data: first } = await get<HealthResponse>('/api/health');

      // Wait briefly
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { data: second } = await get<HealthResponse>('/api/health');

      expect(second.data.uptime).toBeGreaterThanOrEqual(first.data.uptime);
    });
  });

  describe('GET /api/health/cli', () => {
    test('should return CLI health status for all CLI types', async () => {
      const { status, data } = await get<CliHealthResponse>('/api/health/cli');

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    test('should include required fields for each CLI status', async () => {
      const { data } = await get<CliHealthResponse>('/api/health/cli');

      for (const cliStatus of data.data) {
        expect(cliStatus.cliType).toBeDefined();
        expect(CLI_TYPES).toContain(cliStatus.cliType);
        expect(cliStatus.status).toBeDefined();
        expect(['healthy', 'unhealthy', 'not_found', 'unknown']).toContain(cliStatus.status);
        expect(cliStatus.lastChecked).toBeDefined();
      }
    });

    test('should include error message when CLI is not found', async () => {
      const { data } = await get<CliHealthResponse>('/api/health/cli');

      for (const cliStatus of data.data) {
        if (cliStatus.status === 'not_found') {
          expect(cliStatus.error).toBeDefined();
          expect(typeof cliStatus.error).toBe('string');
        }
      }
    });

    test('should include claude CLI type', async () => {
      const { data } = await get<CliHealthResponse>('/api/health/cli');

      const claudeStatus = data.data.find((s) => s.cliType === 'claude');
      expect(claudeStatus).toBeDefined();
    });

    test('should have valid lastChecked timestamp for each CLI', async () => {
      const { data } = await get<CliHealthResponse>('/api/health/cli');

      for (const cliStatus of data.data) {
        const timestamp = new Date(cliStatus.lastChecked);
        expect(timestamp.toISOString()).toBe(cliStatus.lastChecked);
      }
    });
  });

  describe('POST /api/health/cli/refresh', () => {
    test('should refresh CLI health detection', async () => {
      const { status, data } = await post<CliHealthResponse>('/api/health/cli/refresh');

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    test('should return updated CLI health status after refresh', async () => {
      // Get initial status
      const { data: beforeData } = await get<CliHealthResponse>('/api/health/cli');
      const beforeTimestamps = new Map(
        beforeData.data.map((s) => [s.cliType as CliType, s.lastChecked])
      );

      // Wait briefly to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh
      const { data: afterData } = await post<CliHealthResponse>('/api/health/cli/refresh');

      // Verify timestamps were updated
      for (const cliStatus of afterData.data) {
        const beforeTs = beforeTimestamps.get(cliStatus.cliType);
        if (beforeTs) {
          const beforeTime = new Date(beforeTs).getTime();
          const afterTime = new Date(cliStatus.lastChecked).getTime();
          expect(afterTime).toBeGreaterThanOrEqual(beforeTime);
        }
      }
    });

    test('should include all CLI types in refreshed response', async () => {
      const { data } = await post<CliHealthResponse>('/api/health/cli/refresh');

      const cliTypes = data.data.map((s) => s.cliType);
      for (const cliType of CLI_TYPES) {
        expect(cliTypes).toContain(cliType);
      }
    });

    test('should return consistent structure with GET endpoint', async () => {
      const { data: refreshData } = await post<CliHealthResponse>('/api/health/cli/refresh');
      const { data: getData } = await get<CliHealthResponse>('/api/health/cli');

      // Both should have same CLI types
      const refreshTypes = refreshData.data.map((s) => s.cliType).sort();
      const getTypes = getData.data.map((s) => s.cliType).sort();
      expect(refreshTypes).toEqual(getTypes);
    });
  });
});
