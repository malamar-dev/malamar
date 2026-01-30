import type { CliAdapter, CliType } from "../cli";
import {
  claudeAdapter,
  codexAdapter,
  geminiAdapter,
  opencodeAdapter,
  setCliHealth,
} from "../cli";

const adapters: CliAdapter[] = [
  claudeAdapter,
  codexAdapter,
  geminiAdapter,
  opencodeAdapter,
];

export async function runCliHealthCheck(signal?: AbortSignal): Promise<void> {
  // Run health checks for all CLIs in parallel
  const results = await Promise.allSettled(
    adapters.map(async (adapter) => {
      try {
        const result = await adapter.healthCheck(signal);
        setCliHealth(result);

        console.log(
          `[CLI Health Check] ${result.type}: ${result.status}${result.error ? ` - ${result.error}` : ""}`,
        );
        return result;
      } catch (error) {
        console.error(
          `[CLI Health Check] Unexpected error for ${adapter.type}:`,
          error,
        );

        const errorResult = {
          type: adapter.type as CliType,
          status: "unhealthy" as const,
          error: error instanceof Error ? error.message : "Unknown error",
          lastCheckedAt: new Date(),
          binaryPath: null,
        };
        setCliHealth(errorResult);
        return errorResult;
      }
    }),
  );

  const healthy = results.filter(
    (r) => r.status === "fulfilled" && r.value.status === "healthy",
  ).length;
  console.log(`[CLI Health Check] ${healthy}/${adapters.length} CLIs healthy`);
}
