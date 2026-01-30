import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cliSettingsApi } from "../api/cli-settings.api.ts";
import type { CliType, UpdateCliSettingsRequest } from "../types/cli.types.ts";
import { cliSettingsKeys } from "./use-cli-settings.ts";

/**
 * Hook to update CLI settings for a specific CLI type.
 */
export function useUpdateCliSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      data,
    }: {
      type: CliType;
      data: UpdateCliSettingsRequest;
    }) => cliSettingsApi.update(type, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cliSettingsKeys.all });
    },
  });
}
