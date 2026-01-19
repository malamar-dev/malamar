/**
 * E2E test setup
 *
 * This file is preloaded before E2E tests run.
 * It configures:
 * - 10 minute (600 second) timeout for E2E tests
 * - E2E tests use real CLI adapters (no mocking)
 */

import { setDefaultTimeout } from 'bun:test';

// Set 10 minute timeout for E2E tests
// E2E tests may spawn real CLI processes and wait for AI responses
setDefaultTimeout(600000);

// Note: E2E tests use real CLI adapters to test the full system
// They do NOT set a test adapter, so getCliAdapter() returns real adapters
