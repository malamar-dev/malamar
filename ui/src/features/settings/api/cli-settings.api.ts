import { apiClient } from "@/lib/api-client.ts";

import type {
  CliSettingsResponse,
  CliType,
  UpdateCliSettingsRequest,
} from "../types/cli.types.ts";

export const cliSettingsApi = {
  /**
   * Get CLI settings for all CLIs.
   */
  getAll: () => apiClient.get<CliSettingsResponse>("/settings/cli"),

  /**
   * Get CLI settings for a specific CLI type.
   */
  get: (type: CliType) =>
    apiClient.get<{ settings: UpdateCliSettingsRequest }>(
      `/settings/cli/${type}`,
    ),

  /**
   * Update CLI settings for a specific CLI type.
   */
  update: (type: CliType, data: UpdateCliSettingsRequest) =>
    apiClient.put<{ settings: UpdateCliSettingsRequest }>(
      `/settings/cli/${type}`,
      data,
    ),
};
