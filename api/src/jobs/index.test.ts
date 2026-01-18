import { afterEach, describe, expect, test } from 'bun:test';

import {
  CLEANUP_INTERVAL_MS,
  HEALTH_CHECK_INTERVAL_MS,
  isJobsRunning,
  startJobs,
  stopJobs,
} from './index.ts';

describe('job scheduler', () => {
  afterEach(() => {
    // Ensure jobs are stopped after each test
    stopJobs();
  });

  describe('startJobs', () => {
    test('starts jobs and sets running state', async () => {
      expect(isJobsRunning()).toBe(false);

      await startJobs();

      expect(isJobsRunning()).toBe(true);
    });

    test('does not start twice if already running', async () => {
      await startJobs();
      expect(isJobsRunning()).toBe(true);

      // Second call should be ignored
      await startJobs();
      expect(isJobsRunning()).toBe(true);
    });
  });

  describe('stopJobs', () => {
    test('stops running jobs', async () => {
      await startJobs();
      expect(isJobsRunning()).toBe(true);

      stopJobs();

      expect(isJobsRunning()).toBe(false);
    });

    test('does nothing if jobs not running', () => {
      expect(isJobsRunning()).toBe(false);

      // Should not throw
      stopJobs();

      expect(isJobsRunning()).toBe(false);
    });
  });

  describe('isJobsRunning', () => {
    test('returns false before start', () => {
      expect(isJobsRunning()).toBe(false);
    });

    test('returns true after start', async () => {
      await startJobs();
      expect(isJobsRunning()).toBe(true);
    });

    test('returns false after stop', async () => {
      await startJobs();
      stopJobs();
      expect(isJobsRunning()).toBe(false);
    });
  });

  describe('interval constants', () => {
    test('CLEANUP_INTERVAL_MS is 24 hours', () => {
      expect(CLEANUP_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
    });

    test('HEALTH_CHECK_INTERVAL_MS is 5 minutes', () => {
      expect(HEALTH_CHECK_INTERVAL_MS).toBe(5 * 60 * 1000);
    });
  });
});
