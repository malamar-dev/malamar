import {
  createRandomTemporaryDir,
  loadConfig,
  removeTemporaryDir,
} from "../../core";
import { CLI_HEALTH_CHECK_PROMPT } from "../../prompts";
import type { CliAdapter, CliHealthResult } from "../types";

const HEALTH_CHECK_TIMEOUT_MS = 60_000;

function resolveBinaryPath(): string | null {
  const config = loadConfig();

  if (config.claudeCodePath) {
    return config.claudeCodePath;
  }

  return Bun.which("claude");
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

    // Check if already aborted before starting
    if (signal?.aborted) {
      return {
        type: "claude",
        status: "unhealthy",
        error: "Health check aborted",
        lastCheckedAt: new Date(),
        binaryPath,
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
        };
      }

      if (!stdout.trim()) {
        return {
          type: "claude",
          status: "unhealthy",
          error: "CLI returned empty response",
          lastCheckedAt: new Date(),
          binaryPath,
        };
      }

      return {
        type: "claude",
        status: "healthy",
        lastCheckedAt: new Date(),
        binaryPath,
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
      };
    } finally {
      removeTemporaryDir(tempDir);
    }
  },
};
