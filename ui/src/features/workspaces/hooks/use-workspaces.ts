import { useQuery } from "@tanstack/react-query";

import { workspacesApi } from "../api/workspaces.api.ts";

export const useWorkspaces = (query?: string) => {
  return useQuery({
    queryKey: ["workspaces", query],
    queryFn: () => workspacesApi.list(query),
  });
};
