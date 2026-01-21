import { useMutation, useQueryClient } from "@tanstack/react-query";

import { agentsApi } from "../api/agents.api.ts";
import type { CreateAgentInput } from "../types/agent.types.ts";

export const useCreateAgent = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAgentInput) =>
      agentsApi.create(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", workspaceId] });
    },
  });
};
