import { useQuery } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";

export const useChat = (id: string) => {
  return useQuery({
    queryKey: ["chat", id],
    queryFn: () => chatsApi.get(id),
    enabled: !!id,
  });
};
