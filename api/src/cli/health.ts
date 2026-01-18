import { logger } from '../core/logger.ts';
import type { CliType } from '../core/types.ts';
import type { CliHealthResult } from './types.ts';

/**
 * Default timeout for health checks in milliseconds (30 seconds)
 */
const DEFAULT_HEALTH_CHECK_TIMEOUT = 30000;

/**
 * Binary names for each CLI type
 */
const CLI_BINARY_NAMES: Record<CliType, string> = {
  claude: 'claude',
  gemini: 'gemini',
  codex: 'codex',
  opencode: 'opencode',
};

/**
 * Check the health of a CLI by locating it and running a minimal test
 *
 * @param cliType - The CLI type to check
 * @param binaryPath - Optional custom path to the CLI binary
 * @returns Health check result
 */
export async function checkCliHealth(
  cliType: CliType,
  binaryPath?: string
): Promise<CliHealthResult> {
  const startTime = Date.now();

  try {
    // Find the binary path
    const resolvedPath = binaryPath ?? (await findBinaryInPath(cliType));

    if (!resolvedPath) {
      return {
        status: 'not_found',
        error: `Binary '${CLI_BINARY_NAMES[cliType]}' not found in PATH`,
        durationMs: Date.now() - startTime,
      };
    }

    // Run a minimal test to verify the CLI is functional
    const testResult = await runHealthTest(cliType, resolvedPath);

    return {
      status: testResult.healthy ? 'healthy' : 'unhealthy',
      binaryPath: resolvedPath,
      version: testResult.version,
      error: testResult.error,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('CLI health check failed', {
      cliType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error during health check',
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Find a CLI binary in the system PATH
 *
 * @param cliType - The CLI type to find
 * @returns The full path to the binary, or null if not found
 */
export async function findBinaryInPath(cliType: CliType): Promise<string | null> {
  const binaryName = CLI_BINARY_NAMES[cliType];

  try {
    // Use 'which' on Unix-like systems to find the binary
    const proc = Bun.spawn(['which', binaryName], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      const output = await new Response(proc.stdout).text();
      const path = output.trim();
      return path || null;
    }

    return null;
  } catch {
    // 'which' command failed or doesn't exist
    return null;
  }
}

/**
 * Result from running a health test on a CLI
 */
interface HealthTestResult {
  healthy: boolean;
  version?: string;
  error?: string;
}

/**
 * Run a minimal health test on a CLI
 *
 * @param cliType - The CLI type to test
 * @param binaryPath - Path to the CLI binary
 * @returns Test result
 */
async function runHealthTest(cliType: CliType, binaryPath: string): Promise<HealthTestResult> {
  try {
    // Build the test command based on CLI type
    const testCommand = buildHealthTestCommand(cliType, binaryPath);

    const proc = Bun.spawn(testCommand.args, {
      cwd: testCommand.cwd,
      env: { ...process.env },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Wait for completion with timeout
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timeoutId = setTimeout(() => resolve('timeout'), DEFAULT_HEALTH_CHECK_TIMEOUT);
    });

    const exitedPromise = proc.exited;
    const result = await Promise.race([exitedPromise, timeoutPromise]);

    // Clear the timeout to prevent memory leak
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (result === 'timeout') {
      proc.kill();
      return {
        healthy: false,
        error: 'CLI health check timed out after 30 seconds',
      };
    }

    const exitCode = result;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    // Check if the CLI exited successfully
    if (exitCode !== 0) {
      return {
        healthy: false,
        error: `CLI exited with code ${exitCode}${stderr ? `: ${stderr.trim()}` : ''}`,
      };
    }

    // Check if stdout is non-empty (health check passes if stdout has content)
    if (!stdout.trim()) {
      return {
        healthy: false,
        error: 'CLI returned empty response',
      };
    }

    // Try to extract version if available
    const version = extractVersion(stdout);

    return {
      healthy: true,
      version,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error running health test',
    };
  }
}

/**
 * Command configuration for a health test
 */
interface HealthTestCommand {
  args: string[];
  cwd?: string;
}

/**
 * Build the health test command for a specific CLI type
 *
 * @param cliType - The CLI type
 * @param binaryPath - Path to the CLI binary
 * @returns Command arguments and configuration
 */
function buildHealthTestCommand(cliType: CliType, binaryPath: string): HealthTestCommand {
  switch (cliType) {
    case 'claude':
      // Claude Code has a --version flag we can use for health checking
      return {
        args: [binaryPath, '--version'],
      };

    case 'gemini':
      // Gemini CLI - try version flag
      return {
        args: [binaryPath, '--version'],
      };

    case 'codex':
      // Codex CLI - try version flag
      return {
        args: [binaryPath, '--version'],
      };

    case 'opencode':
      // OpenCode - try version flag
      return {
        args: [binaryPath, '--version'],
      };

    default:
      // Fallback to --version for unknown CLIs
      return {
        args: [binaryPath, '--version'],
      };
  }
}

/**
 * Extract version string from CLI output
 *
 * @param output - CLI stdout output
 * @returns Version string if found
 */
function extractVersion(output: string): string | undefined {
  // Common version patterns:
  // "claude 1.2.3"
  // "v1.2.3"
  // "1.2.3"
  // "Version: 1.2.3"
  const versionPatterns = [
    /(?:version[:\s]+)?v?(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.]+)?)/i,
    /^v?(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.]+)?)\s*$/m,
  ];

  for (const pattern of versionPatterns) {
    const match = output.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Get the binary name for a CLI type
 *
 * @param cliType - The CLI type
 * @returns The binary name
 */
export function getCliBinaryName(cliType: CliType): string {
  return CLI_BINARY_NAMES[cliType];
}
