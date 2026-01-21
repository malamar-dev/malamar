import { useQuery } from "@tanstack/react-query";

import { workspacesApi } from "../api/workspaces.api.ts";

export const useWorkspace = (id: string) => {
  return useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspacesApi.get(id),
    enabled: !!id,
  });
};
