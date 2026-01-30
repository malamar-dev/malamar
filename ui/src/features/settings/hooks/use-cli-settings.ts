import { useQuery } from "@tanstack/react-query";

import { cliSettingsApi } from "../api/cli-settings.api.ts";

export const cliSettingsKeys = {
  all: ["cli-settings"] as const,
};

/**
 * Hook to fetch all CLI settings.
 */
export function useCliSettings() {
  return useQuery({
    queryKey: cliSettingsKeys.all,
    queryFn: () => cliSettingsApi.getAll(),
  });
}
