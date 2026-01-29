import { useMutation, useQueryClient } from "@tanstack/react-query";

import { healthApi } from "../api/health.api.ts";

export const useRefreshHealth = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: healthApi.refresh,
    onSuccess: (data) => {
      // Update the health query cache with fresh data
      queryClient.setQueryData(["health"], data);
    },
  });
};
