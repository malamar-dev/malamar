import { useQuery } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";
import type { PaginationParams } from "../types/chat.types.ts";

const POLLING_INTERVAL = 5000; // 5 seconds

export const useMessages = (
  chatId: string,
  params?: PaginationParams,
  isProcessing?: boolean,
) => {
  return useQuery({
    queryKey: ["chat-messages", chatId, params],
    queryFn: () => chatsApi.getMessages(chatId, params),
    enabled: !!chatId,
    // Only poll when processing to catch new agent messages
    refetchInterval: isProcessing ? POLLING_INTERVAL : false,
  });
};
