import { useMutation, useQueryClient } from "@tanstack/react-query";

import { agentsApi } from "../api/agents.api.ts";
import type { UpdateAgentInput } from "../types/agent.types.ts";

export const useUpdateAgent = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      input,
    }: {
      agentId: string;
      input: UpdateAgentInput;
    }) => agentsApi.update(agentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", workspaceId] });
    },
  });
};
