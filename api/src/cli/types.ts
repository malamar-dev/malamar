export type CliHealthStatus = "healthy" | "unhealthy";

export type CliType = "claude";

export interface CliHealthResult {
  type: CliType;
  status: CliHealthStatus;
  error?: string;
  lastCheckedAt: Date;
  binaryPath: string | null;
}

export interface CliAdapter {
  type: CliType;
  healthCheck(signal?: AbortSignal): Promise<CliHealthResult>;
}
