import {
  AlertCircleIcon,
  ChevronDownIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCreateChat } from "@/features/chats";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs.tsx";
import { useAgents } from "@/features/workspaces/hooks/use-agents.ts";
import { useWorkspace } from "@/features/workspaces/hooks/use-workspace.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";

import { ChatItem } from "../../components/chat-item.tsx";
import { LoadMoreButton } from "../../components/load-more-button.tsx";
import { useInfiniteChats } from "../../hooks/use-chats.ts";

interface EmptyStateProps {
  isSearching: boolean;
  onCreateChat: (agentId?: string) => void;
  agents: { id: string; name: string }[];
  isCreating: boolean;
}

function EmptyState({
  isSearching,
  onCreateChat,
  agents,
  isCreating,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <MessageSquareIcon className="text-muted-foreground mb-4 h-12 w-12" />
      <p className="text-muted-foreground mb-4 text-lg">
        {isSearching ? "No chats match your search" : "No conversations yet"}
      </p>
      {!isSearching && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isCreating}>
              <PlusIcon className="h-4 w-4" />
              Start a conversation
              <ChevronDownIcon className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => onCreateChat()}>
              <SparklesIcon className="mr-2 h-4 w-4" />
              Malamar
            </DropdownMenuItem>
            {agents.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {agents.map((agent) => (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => onCreateChat(agent.id)}
                  >
                    {agent.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

const ChatsPage = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedQuery = useDebounce(inputValue, 300);

  const { data: workspace } = useWorkspace(workspaceId ?? "");
  const { data: agentsData } = useAgents(workspaceId ?? "");
  const createChat = useCreateChat(workspaceId ?? "");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value) {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
  };

  // Fetch chats with infinite query (handles accumulation automatically)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteChats(workspaceId ?? "", { q: debouncedQuery || undefined });

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
  const isSearching = !!debouncedQuery;

  return (
    <AppLayout
      breadcrumbItems={[
        { label: "Workspaces", href: "/workspaces" },
        { label: workspace?.title ?? "" },
      ]}
      variant="sm"
    >
      <div className="mb-4 flex items-center justify-start gap-4">
        <div>
          <WorkspaceTabs
            workspaceId={workspace?.id as string}
            currentPage="chats"
          />
        </div>

        <div className="relative ml-auto max-w-xs flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search chats..."
            value={inputValue}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={createChat.isPending}>
                <PlusIcon className="h-4 w-4" />
                Chat
                <ChevronDownIcon className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateChat()}>
                <SparklesIcon className="mr-2 h-4 w-4" />
                Malamar
              </DropdownMenuItem>
              {agents.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {agents.map((agent) => (
                    <DropdownMenuItem
                      key={agent.id}
                      onClick={() => handleCreateChat(agent.id)}
                    >
                      {agent.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
        <EmptyState
          isSearching={isSearching}
          onCreateChat={handleCreateChat}
          agents={agents}
          isCreating={createChat.isPending}
        />
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
