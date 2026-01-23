import { useQuery } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";

export const useChats = (workspaceId: string) => {
  return useQuery({
    queryKey: ["chats", workspaceId],
    queryFn: () => chatsApi.list(workspaceId),
    enabled: !!workspaceId,
  });
};
