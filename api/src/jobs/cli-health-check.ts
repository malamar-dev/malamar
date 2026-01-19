import { claudeAdapter, setCliHealth } from "../cli";

export async function runCliHealthCheck(signal?: AbortSignal): Promise<void> {
  try {
    const result = await claudeAdapter.healthCheck(signal);
    setCliHealth(result);

    console.log(
      `[CLI Health Check] ${result.type}: ${result.status}${result.error ? ` - ${result.error}` : ""}`,
    );
  } catch (error) {
    console.error("[CLI Health Check] Unexpected error:", error);

    setCliHealth({
      type: "claude",
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      lastCheckedAt: new Date(),
      binaryPath: null,
    });
  }
}
