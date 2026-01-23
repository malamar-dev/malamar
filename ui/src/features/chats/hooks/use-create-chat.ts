import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";
import type { CreateChatInput } from "../types/chat.types.ts";

export const useCreateChat = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateChatInput) => chatsApi.create(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", workspaceId] });
    },
  });
};
