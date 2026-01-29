import { useMutation } from "@tanstack/react-query";

import { workspacesApi } from "../api/workspaces.api.ts";

export const useValidatePath = () => {
  return useMutation({
    mutationFn: (path: string) => workspacesApi.validatePath(path),
  });
};
