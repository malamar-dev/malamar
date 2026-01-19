import { Hono } from "hono";

import { getAllCliHealth } from "../cli";

export const healthRouter = new Hono();

healthRouter.get("/", (c) => {
  const cliResults = getAllCliHealth();

  const clis =
    cliResults.length > 0
      ? cliResults.map((result) => ({
          type: result.type,
          status: result.status,
          error: result.error,
          lastCheckedAt: result.lastCheckedAt.toISOString(),
          binaryPath: result.binaryPath,
          version: result.version,
        }))
      : [
          {
            type: "claude",
            status: "unhealthy",
            error: "Health check has not run yet",
            lastCheckedAt: null,
            binaryPath: null,
            version: null,
          },
        ];

  return c.json({ status: "ok", clis });
});
