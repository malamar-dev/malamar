import { describe, expect, test } from "bun:test";

import { getBaseUrl } from "../helpers";

interface HealthResponse {
  status: string;
  clis: Array<{
    type: string;
    status: string;
    error?: string;
    lastCheckedAt: string | null;
    binaryPath: string | null;
    version?: string | null;
  }>;
}

describe("Health endpoint", () => {
  test("GET /api/health returns 200 with status ok and clis array", async () => {
    const response = await fetch(`${getBaseUrl()}/api/health`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as HealthResponse;
    expect(body.status).toBe("ok");
    expect(Array.isArray(body.clis)).toBe(true);
    expect(body.clis.length).toBeGreaterThan(0);

    // Verify CLI structure
    const cli = body.clis[0]!;
    expect(cli.type).toBe("claude");
    expect(["healthy", "unhealthy"]).toContain(cli.status);
    expect(cli).toHaveProperty("binaryPath");
    expect(cli).toHaveProperty("version");
  });
});
