import { useMutation, useQueryClient } from "@tanstack/react-query";

import { agentsApi } from "../api/agents.api.ts";
import type { ReorderAgentsInput } from "../types/agent.types.ts";

export const useReorderAgents = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderAgentsInput) =>
      agentsApi.reorder(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", workspaceId] });
    },
  });
};
