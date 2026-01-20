import { useQuery } from "@tanstack/react-query";

import { workspacesApi } from "../api/workspaces.api.ts";

export const useWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
  });
};
