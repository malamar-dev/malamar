import { describe, expect, test } from "bun:test";

import { getBaseUrl } from "../helpers";

describe("Health endpoint", () => {
  test("GET /api/health returns 200 with status ok", async () => {
    const response = await fetch(`${getBaseUrl()}/api/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });
});
