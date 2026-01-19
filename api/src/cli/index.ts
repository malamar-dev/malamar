import type { CliType } from '../core/types.ts';
import { createClaudeAdapter } from './adapters/claude.ts';
import type { CliAdapter } from './types.ts';

// Types
export type {
  CliAdapter,
  CliHealthResult,
  CliInvocationOptions,
  CliInvocationResult,
  InvocationType,
} from './types.ts';

// Health checking
export { checkCliHealth, findBinaryInPath, getCliBinaryName } from './health.ts';

// Claude adapter
export { ClaudeAdapter, createClaudeAdapter } from './adapters/claude.ts';
export { CHAT_OUTPUT_SCHEMA, TASK_OUTPUT_SCHEMA } from './adapters/claude.ts';

// Mock adapter (for testing)
export {
  createFailingAdapter,
  createMockAdapter,
  createNotFoundAdapter,
  createSuccessfulChatAdapter,
  createSuccessfulTaskAdapter,
  MockCliAdapter,
} from './adapters/mock.ts';
export type {
  MockChatResponse,
  MockHealthConfig,
  MockInvocationConfig,
  MockResponse,
  MockTaskResponse,
} from './adapters/mock.ts';

/**
 * Test adapter override
 *
 * When set, getCliAdapter() and isCliAdapterAvailable() will use this adapter
 * instead of the real CLI adapters. This allows tests to mock CLI behavior
 * without spawning real processes.
 *
 * Usage in tests:
 * ```typescript
 * import { setTestAdapter, MockCliAdapter } from '../cli/index.ts';
 *
 * beforeEach(() => {
 *   const mockAdapter = new MockCliAdapter();
 *   setTestAdapter(mockAdapter);
 * });
 *
 * afterEach(() => {
 *   clearTestAdapter();
 * });
 * ```
 */
let testAdapter: CliAdapter | null = null;

/**
 * Set a test adapter to override all CLI adapter calls
 *
 * @param adapter - The adapter to use for all getCliAdapter() calls
 */
export function setTestAdapter(adapter: CliAdapter): void {
  testAdapter = adapter;
}

/**
 * Clear the test adapter override
 */
export function clearTestAdapter(): void {
  testAdapter = null;
}

/**
 * Get the current test adapter (for assertions in tests)
 */
export function getTestAdapter(): CliAdapter | null {
  return testAdapter;
}

/**
 * Get a CLI adapter for the specified CLI type
 *
 * If a test adapter has been set via setTestAdapter(), that adapter
 * is returned instead of the real adapter.
 *
 * @param cliType - The CLI type to get an adapter for
 * @param options - Optional configuration for the adapter
 * @returns CLI adapter instance
 * @throws Error if the CLI type is not supported
 */
export function getCliAdapter(
  cliType: CliType,
  options?: { binaryPath?: string }
): CliAdapter {
  // Return test adapter if set
  if (testAdapter) {
    return testAdapter;
  }

  switch (cliType) {
    case 'claude':
      return createClaudeAdapter(options);

    case 'gemini':
    case 'codex':
    case 'opencode':
      throw new Error(`CLI adapter for '${cliType}' is not yet implemented`);

    default:
      throw new Error(`Unknown CLI type: ${cliType}`);
  }
}

/**
 * Check if a CLI adapter is available for the given type
 *
 * If a test adapter has been set, always returns true.
 *
 * @param cliType - The CLI type to check
 * @returns true if an adapter is implemented for this CLI type
 */
export function isCliAdapterAvailable(cliType: CliType): boolean {
  // Test adapter is always available
  if (testAdapter) {
    return true;
  }
  return cliType === 'claude';
}

/**
 * Get the first healthy CLI type
 *
 * This function returns the first CLI type that has an implemented adapter.
 * In the future, this could be expanded to check actual health status.
 *
 * If a test adapter is set, returns 'claude' (default for testing).
 *
 * @returns The first healthy CLI type, or null if none available
 */
export function getFirstHealthyCli(): CliType | null {
  // Test adapter provides claude by default
  if (testAdapter) {
    return 'claude';
  }
  // Currently only claude is implemented
  if (isCliAdapterAvailable('claude')) {
    return 'claude';
  }
  return null;
}
