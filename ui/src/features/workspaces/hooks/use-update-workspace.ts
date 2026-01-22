import { useMutation, useQueryClient } from "@tanstack/react-query";

import { workspacesApi } from "../api/workspaces.api.ts";
import type { UpdateWorkspaceInput } from "../types/workspace.types.ts";

export const useUpdateWorkspace = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkspaceInput) =>
      workspacesApi.update(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};
