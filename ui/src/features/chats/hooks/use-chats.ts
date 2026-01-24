import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { chatsApi } from "../api/chats.api.ts";
import type { ListChatsParams } from "../types/chat.types.ts";

/**
 * Hook for fetching a single page of chats.
 * Use useInfiniteChats for load-more functionality.
 */
export const useChats = (workspaceId: string, params?: ListChatsParams) => {
  return useQuery({
    queryKey: ["chats", workspaceId, params],
    queryFn: () => chatsApi.list(workspaceId, params),
    enabled: !!workspaceId,
  });
};

const PAGE_SIZE = 10;

/**
 * Hook for infinite scrolling/load-more chat list.
 * Automatically accumulates pages as user loads more.
 */
export const useInfiniteChats = (
  workspaceId: string,
  options?: { q?: string },
) => {
  return useInfiniteQuery({
    queryKey: ["chats", workspaceId, "infinite", options?.q],
    queryFn: ({ pageParam = 0 }) =>
      chatsApi.list(workspaceId, {
        q: options?.q || undefined,
        offset: pageParam,
        limit: PAGE_SIZE,
      }),
    enabled: !!workspaceId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.hasMore) {
        return undefined;
      }
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
  });
};
