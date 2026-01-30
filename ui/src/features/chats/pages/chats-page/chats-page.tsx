import {
  AlertCircleIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  PlusIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ButtonGroup } from "@/components/ui/button-group.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDocumentTitle } from "@/hooks/use-document-title.ts";
import { useCreateChat } from "@/features/chats";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs.tsx";
import { useAgents } from "@/features/workspaces/hooks/use-agents.ts";
import { useWorkspace } from "@/features/workspaces/hooks/use-workspace.ts";

import { ChatItem } from "../../components/chat-item.tsx";
import { LoadMoreButton } from "../../components/load-more-button.tsx";
import { useInfiniteChats } from "../../hooks/use-chats.ts";

function EmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <MessageSquareIcon className="text-muted-foreground mb-4 h-12 w-12" />
      <p className="text-muted-foreground mb-4 text-lg">
        {isSearching ? "No chats match your search" : "No chats yet"}
      </p>
    </div>
  );
}

const ChatsPage = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const { data: workspace } = useWorkspace(workspaceId ?? "");
  const { data: agentsData } = useAgents(workspaceId ?? "");
  const createChat = useCreateChat(workspaceId ?? "");

  useDocumentTitle(workspace?.title ? `Chats - ${workspace.title}` : "Chats");

  // Fetch chats with infinite query (handles accumulation automatically)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteChats(workspaceId ?? "", {});

  // Flatten pages into a single array of chats
  const chats = useMemo(
    () => data?.pages.flatMap((page) => page.chats) ?? [],
    [data?.pages],
  );

  // Build agent name lookup
  const agentNameMap = new Map(
    agentsData?.agents.map((a) => [a.id, a.name]) ?? [],
  );

  // Extract agents array for cleaner code
  const agents = agentsData?.agents ?? [];

  const handleCreateChat = async (agentId?: string) => {
    const newChat = await createChat.mutateAsync({ agentId: agentId ?? null });
    navigate(`/chat/${newChat.id}`);
  };

  const handleLoadMore = () => {
    fetchNextPage();
  };

  const hasMore = hasNextPage ?? false;
  const isLoadingMore = isFetchingNextPage;
  const showInitialLoading = isLoading && chats.length === 0;

  return (
    <AppLayout
      breadcrumbItems={[
        { label: "Workspaces", href: "/workspaces" },
        { label: workspace?.title ?? "" },
      ]}
      variant="sm"
    >
      <div className="mb-4 flex items-center justify-start">
        <div>
          <WorkspaceTabs
            workspaceId={workspace?.id as string}
            currentPage="chats"
          />
        </div>

        <div className="ml-auto">
          {agents.length > 0 ? (
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => handleCreateChat()}
                disabled={createChat.isPending}
              >
                <PlusIcon /> Chat
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={createChat.isPending}>
                    <MoreVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {agents.map((agent) => (
                    <DropdownMenuItem
                      key={agent.id}
                      onClick={() => handleCreateChat(agent.id)}
                    >
                      {agent.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          ) : (
            <Button
              onClick={() => handleCreateChat()}
              disabled={createChat.isPending}
            >
              <PlusIcon /> Chat
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {showInitialLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p>{error?.message ?? "An unexpected error occurred"}</p>
          </AlertDescription>
        </Alert>
      ) : chats.length === 0 ? (
        <EmptyState isSearching={false} />
      ) : (
        <div className="flex flex-col space-y-4">
          {chats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              agentName={
                chat.agentId ? agentNameMap.get(chat.agentId) : undefined
              }
            />
          ))}

          <LoadMoreButton
            onClick={handleLoadMore}
            isLoading={isLoadingMore}
            hasMore={hasMore}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default ChatsPage;
