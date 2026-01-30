import {
  createRandomTemporaryDir,
  loadConfig,
  removeTemporaryPath,
} from "../../core";
import { CLI_HEALTH_CHECK_PROMPT } from "../../prompts";
import { settingsRepository } from "../../settings";
import type { CliAdapter, CliHealthResult } from "../types";

const HEALTH_CHECK_TIMEOUT_MS = 60_000;
const VERSION_CHECK_TIMEOUT_MS = 60_000;

/**
 * Resolve the Claude CLI binary path.
 * Priority: 1. Database settings, 2. Environment variable, 3. PATH lookup
 */
export function resolveBinaryPath(): string | null {
  // 1. Check database settings first
  const cliSettings = settingsRepository.getCliSettings();
  if (cliSettings.claude?.binaryPath) {
    return cliSettings.claude.binaryPath;
  }

  // 2. Check environment variable
  const config = loadConfig();
  if (config.claudeCodePath) {
    return config.claudeCodePath;
  }

  // 3. Fallback to PATH lookup
  return Bun.which("claude");
}

async function getVersion(
  binaryPath: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  try {
    // Check if already aborted
    if (signal?.aborted) {
      return undefined;
    }

    const proc = Bun.spawn([binaryPath, "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    // Kill subprocess if abort signal fires
    const abortHandler = () => {
      proc.kill();
    };
    signal?.addEventListener("abort", abortHandler, { once: true });

    const timeoutPromise = new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), VERSION_CHECK_TIMEOUT_MS);
    });

    const exitPromise = proc.exited;
    const result = await Promise.race([exitPromise, timeoutPromise]);

    // Clean up abort listener
    signal?.removeEventListener("abort", abortHandler);

    // Check if aborted during execution
    if (signal?.aborted) {
      return undefined;
    }

    if (result === "timeout") {
      proc.kill();
      return undefined;
    }

    const exitCode = result;
    if (exitCode !== 0) {
      return undefined;
    }

    const stdout = await new Response(proc.stdout).text();
    const versionLine = stdout.trim().split("\n")[0];

    // Parse version from output (e.g., "claude 1.0.5" or "Claude Code version 1.0.5")
    if (versionLine) {
      // Try to extract version number (semver-like pattern)
      const versionMatch = versionLine.match(/(\d+\.\d+\.\d+(?:-\w+)?)/);
      if (versionMatch) {
        return versionMatch[1];
      }
      // Fallback: return the whole line if no semver found
      return versionLine;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export const claudeAdapter: CliAdapter = {
  type: "claude",

  async healthCheck(signal?: AbortSignal): Promise<CliHealthResult> {
    const binaryPath = resolveBinaryPath();

    if (!binaryPath) {
      return {
        type: "claude",
        status: "unhealthy",
        error: "Binary not found in PATH",
        lastCheckedAt: new Date(),
        binaryPath: null,
      };
    }

    // Always attempt to get version when binaryPath exists
    const version = await getVersion(binaryPath, signal);

    // Check if already aborted before starting health check
    if (signal?.aborted) {
      return {
        type: "claude",
        status: "unhealthy",
        error: "Health check aborted",
        lastCheckedAt: new Date(),
        binaryPath,
        version,
      };
    }

    let tempDir: string | null = null;

    try {
      tempDir = await createRandomTemporaryDir();

      const proc = Bun.spawn([binaryPath, "--print", CLI_HEALTH_CHECK_PROMPT], {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      // Kill subprocess if abort signal fires
      const abortHandler = () => {
        proc.kill();
      };
      signal?.addEventListener("abort", abortHandler, { once: true });

      const timeoutPromise = new Promise<"timeout">((resolve) => {
        setTimeout(() => resolve("timeout"), HEALTH_CHECK_TIMEOUT_MS);
      });

      const exitPromise = proc.exited;

      const result = await Promise.race([exitPromise, timeoutPromise]);

      // Clean up abort listener
      signal?.removeEventListener("abort", abortHandler);

      // Check if aborted during execution
      if (signal?.aborted) {
        return {
          type: "claude",
          status: "unhealthy",
          error: "Health check aborted",
          lastCheckedAt: new Date(),
          binaryPath,
          version,
        };
      }

      if (result === "timeout") {
        proc.kill();

        return {
          type: "claude",
          status: "unhealthy",
          error: "CLI health check timed out",
          lastCheckedAt: new Date(),
          binaryPath,
          version,
        };
      }

      const exitCode = result;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      if (exitCode !== 0) {
        const output = (stderr || stdout).trim();
        const errorDetail = output
          ? `CLI exited with code ${exitCode}: ${output}`
          : `CLI exited with code ${exitCode}`;

        return {
          type: "claude",
          status: "unhealthy",
          error: errorDetail,
          lastCheckedAt: new Date(),
          binaryPath,
          version,
        };
      }

      if (!stdout.trim()) {
        return {
          type: "claude",
          status: "unhealthy",
          error: "CLI returned empty response",
          lastCheckedAt: new Date(),
          binaryPath,
          version,
        };
      }

      return {
        type: "claude",
        status: "healthy",
        lastCheckedAt: new Date(),
        binaryPath,
        version,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        type: "claude",
        status: "unhealthy",
        error: errorMessage,
        lastCheckedAt: new Date(),
        binaryPath,
        version,
      };
    } finally {
      removeTemporaryPath(tempDir);
    }
  },
};
