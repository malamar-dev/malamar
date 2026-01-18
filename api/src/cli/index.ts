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

/**
 * Get a CLI adapter for the specified CLI type
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
 * @param cliType - The CLI type to check
 * @returns true if an adapter is implemented for this CLI type
 */
export function isCliAdapterAvailable(cliType: CliType): boolean {
  return cliType === 'claude';
}

/**
 * Get the first healthy CLI type
 *
 * This function returns the first CLI type that has an implemented adapter.
 * In the future, this could be expanded to check actual health status.
 *
 * @returns The first healthy CLI type, or null if none available
 */
export function getFirstHealthyCli(): CliType | null {
  // Currently only claude is implemented
  if (isCliAdapterAvailable('claude')) {
    return 'claude';
  }
  return null;
}
