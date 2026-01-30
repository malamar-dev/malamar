import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";

/**
 * Hook for deleting a chat.
 */
export const useDeleteChat = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatsApi.delete(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", workspaceId] });
    },
  });
};
