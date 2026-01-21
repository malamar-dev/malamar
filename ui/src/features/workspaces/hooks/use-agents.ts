import { useQuery } from "@tanstack/react-query";

import { agentsApi } from "../api/agents.api.ts";

export const useAgents = (workspaceId: string) => {
  return useQuery({
    queryKey: ["agents", workspaceId],
    queryFn: () => agentsApi.list(workspaceId),
    enabled: !!workspaceId,
  });
};
