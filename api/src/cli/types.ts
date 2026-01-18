import type { CliType } from '../core/types.ts';

/**
 * Type of invocation for schema selection
 */
export type InvocationType = 'task' | 'chat';

/**
 * Options for CLI invocation
 */
export interface CliInvocationOptions {
  /** Path to the input file containing task/chat context */
  inputPath: string;
  /** Path where the CLI should write its output */
  outputPath: string;
  /** Working directory for the CLI process */
  cwd: string;
  /** Type of invocation - affects which JSON schema is used (default: 'task') */
  type?: InvocationType;
  /** Optional environment variables to merge with system env */
  env?: Record<string, string>;
  /** Optional custom binary path (overrides PATH lookup) */
  binaryPath?: string;
  /** Optional timeout in milliseconds (default varies by operation) */
  timeout?: number;
}

/**
 * Result from a CLI invocation
 */
export interface CliInvocationResult {
  /** Whether the invocation completed successfully */
  success: boolean;
  /** Exit code from the CLI process */
  exitCode: number;
  /** Standard output from the CLI (if any) */
  stdout?: string;
  /** Standard error from the CLI (if any) */
  stderr?: string;
  /** Error message if invocation failed */
  error?: string;
  /** Duration of the invocation in milliseconds */
  durationMs?: number;
}

/**
 * Result from a CLI health check
 *
 * Note: This aligns with the CliHealthCheckResult in health/types.ts
 * but is defined here for CLI adapter independence.
 */
export interface CliHealthResult {
  /** Current health status */
  status: 'healthy' | 'unhealthy' | 'not_found';
  /** Path to the CLI binary (if found) */
  binaryPath?: string;
  /** CLI version (if available) */
  version?: string;
  /** Error message (if unhealthy or not found) */
  error?: string;
  /** Duration of the health check in milliseconds */
  durationMs?: number;
}

/**
 * CLI adapter interface for invoking code agents
 *
 * Each supported CLI (Claude Code, Gemini CLI, Codex CLI, OpenCode)
 * implements this interface to provide a consistent way to:
 * - Invoke the CLI with input/output file paths
 * - Check CLI health/availability
 */
export interface CliAdapter {
  /** The CLI type this adapter handles */
  readonly cliType: CliType;

  /**
   * Invoke the CLI with the given options
   *
   * The CLI reads from inputPath and writes its response to outputPath.
   * The cwd parameter sets the working directory for file operations.
   *
   * @param options - Invocation options including paths and environment
   * @returns Promise resolving to the invocation result
   */
  invoke(options: CliInvocationOptions): Promise<CliInvocationResult>;

  /**
   * Check if the CLI is healthy and available
   *
   * This performs a minimal health check:
   * 1. Locate the binary (in PATH or custom path)
   * 2. Run a simple test prompt
   * 3. Verify the CLI responds correctly
   *
   * Timeout: 30 seconds by default (as per TECHNICAL_DESIGN.md)
   *
   * @param binaryPath - Optional custom path to the CLI binary
   * @returns Promise resolving to the health check result
   */
  healthCheck(binaryPath?: string): Promise<CliHealthResult>;
}
