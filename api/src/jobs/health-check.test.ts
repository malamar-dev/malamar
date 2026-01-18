import { afterEach, describe, expect, test } from 'bun:test';

import { CLI_TYPES } from '../core/types.ts';
import {
  clearHealthStatus,
  getAllCliHealthStatus,
  getCliHealthStatus,
  getFirstHealthyCliType,
  isCliHealthy,
  runHealthCheck,
} from './health-check.ts';

describe('health check job', () => {
  afterEach(() => {
    clearHealthStatus();
  });

  describe('runHealthCheck', () => {
    test('checks all CLI types', async () => {
      const result = await runHealthCheck();

      expect(result.checked).toBe(CLI_TYPES.length);
      expect(result.healthy + result.unhealthy + result.notFound).toBe(CLI_TYPES.length);
    });

    test('returns result with counts', async () => {
      const result = await runHealthCheck();

      expect(result).toHaveProperty('checked');
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('unhealthy');
      expect(result).toHaveProperty('notFound');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('stores health status for each CLI', async () => {
      await runHealthCheck();

      const allStatus = getAllCliHealthStatus();
      expect(allStatus.length).toBeGreaterThanOrEqual(1);

      for (const status of allStatus) {
        expect(status).toHaveProperty('cliType');
        expect(status).toHaveProperty('result');
        expect(status).toHaveProperty('lastChecked');
        expect(CLI_TYPES).toContain(status.cliType);
      }
    });
  });

  describe('getCliHealthStatus', () => {
    test('returns undefined for unchecked CLI', () => {
      const status = getCliHealthStatus('claude');
      expect(status).toBeUndefined();
    });

    test('returns status after health check', async () => {
      await runHealthCheck();

      const status = getCliHealthStatus('claude');
      expect(status).toBeDefined();
      expect(status?.cliType).toBe('claude');
      expect(status?.result).toHaveProperty('status');
      expect(status?.lastChecked).toBeDefined();
    });
  });

  describe('getAllCliHealthStatus', () => {
    test('returns empty array before health check', () => {
      const allStatus = getAllCliHealthStatus();
      expect(allStatus).toEqual([]);
    });

    test('returns all statuses after health check', async () => {
      await runHealthCheck();

      const allStatus = getAllCliHealthStatus();
      expect(allStatus.length).toBe(CLI_TYPES.length);
    });
  });

  describe('isCliHealthy', () => {
    test('returns false for unchecked CLI', () => {
      expect(isCliHealthy('claude')).toBe(false);
    });

    test('returns correct status after health check', async () => {
      await runHealthCheck();

      // The result depends on whether claude CLI is installed
      const status = getCliHealthStatus('claude');
      if (status?.result.status === 'healthy') {
        expect(isCliHealthy('claude')).toBe(true);
      } else {
        expect(isCliHealthy('claude')).toBe(false);
      }
    });
  });

  describe('getFirstHealthyCliType', () => {
    test('returns null before health check', () => {
      const result = getFirstHealthyCliType();
      expect(result).toBeNull();
    });

    test('returns first healthy CLI after health check', async () => {
      await runHealthCheck();

      const firstHealthy = getFirstHealthyCliType();
      const allStatus = getAllCliHealthStatus();
      const hasHealthy = allStatus.some((s) => s.result.status === 'healthy');

      if (hasHealthy) {
        expect(firstHealthy).not.toBeNull();
        expect(isCliHealthy(firstHealthy!)).toBe(true);
      } else {
        expect(firstHealthy).toBeNull();
      }
    });
  });

  describe('clearHealthStatus', () => {
    test('clears all stored status', async () => {
      await runHealthCheck();
      expect(getAllCliHealthStatus().length).toBeGreaterThan(0);

      clearHealthStatus();
      expect(getAllCliHealthStatus()).toEqual([]);
    });
  });
});
