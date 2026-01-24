import { apiClient } from "@/lib/api-client.ts";

import type { HealthResponse } from "../types/health.types.ts";

export const healthApi = {
  /**
   * Checks the health status of all configured CLIs.
   * @returns Health status for each CLI type
   */
  get: () => apiClient.get<HealthResponse>("/health"),
};
