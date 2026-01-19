import { apiClient } from "@/lib/api-client.ts";

import type { HealthResponse } from "../types/health.types.ts";

export const healthApi = {
  get: () => apiClient.get<HealthResponse>("/health"),
};
