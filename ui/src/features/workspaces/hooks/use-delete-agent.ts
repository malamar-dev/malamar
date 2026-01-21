import { useMutation, useQueryClient } from "@tanstack/react-query";

import { agentsApi } from "../api/agents.api.ts";

export const useDeleteAgent = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => agentsApi.delete(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", workspaceId] });
    },
  });
};
