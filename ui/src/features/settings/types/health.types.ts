export type CliHealthStatus = "healthy" | "unhealthy";

export type CliType = "claude";

export interface CliHealth {
  type: CliType;
  status: CliHealthStatus;
  error?: string;
  lastCheckedAt: string | null;
  binaryPath: string | null;
  version?: string | null;
}

export interface HealthResponse {
  status: "ok";
  clis: CliHealth[];
}
