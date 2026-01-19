/**
 * Integration test setup
 *
 * This file is preloaded before integration tests run.
 * It configures:
 * - 60 second timeout for integration tests
 * - Mock CLI adapter to avoid spawning real CLI processes
 */

import { setDefaultTimeout } from 'bun:test';

import { clearTestAdapter, createSuccessfulTaskAdapter, setTestAdapter } from '../src/cli/index.ts';

// Set 60 second timeout for integration tests
setDefaultTimeout(60000);

// Set up a default mock adapter for integration tests
// Individual tests can override this with their own adapter
const defaultMockAdapter = createSuccessfulTaskAdapter([{ type: 'skip' }]);
setTestAdapter(defaultMockAdapter);

// Note: Tests that need specific mock behavior should:
// 1. Import setTestAdapter, clearTestAdapter from cli module
// 2. Set up their own mock adapter in beforeEach
// 3. Clear the adapter in afterEach if needed

// Export for use in tests if needed
export { clearTestAdapter, setTestAdapter };
