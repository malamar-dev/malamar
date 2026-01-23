import { useQuery } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";

const POLLING_INTERVAL = 5000; // 5 seconds

export const useChat = (id: string) => {
  return useQuery({
    queryKey: ["chat", id],
    queryFn: () => chatsApi.get(id),
    enabled: !!id,
    // Poll every 5 seconds when chat is processing
    refetchInterval: (query) => {
      const chat = query.state.data;
      return chat?.isProcessing ? POLLING_INTERVAL : false;
    },
  });
};
