import { useMutation, useQueryClient } from "@tanstack/react-query";

import { workspacesApi } from "../api/workspaces.api.ts";
import type { CreateWorkspaceInput } from "../types/workspace.types.ts";

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => workspacesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};
