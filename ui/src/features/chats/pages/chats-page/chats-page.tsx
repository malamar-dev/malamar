import { AlertCircleIcon, MessageSquareIcon, PlusIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs.tsx";
import { useAgents } from "@/features/workspaces/hooks/use-agents.ts";
import { useWorkspace } from "@/features/workspaces/hooks/use-workspace.ts";

import { ChatItem } from "../../components/chat-item.tsx";
import { useChats } from "../../hooks/use-chats.ts";
import { useCreateChat } from "../../hooks/use-create-chat.ts";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <MessageSquareIcon className="text-muted-foreground mb-4 h-12 w-12" />
      <p className="text-muted-foreground mb-4 text-lg">No chats yet</p>
    </div>
  );
}

const ChatsPage = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const { data: workspace } = useWorkspace(workspaceId ?? "");
  const { data: agentsData } = useAgents(workspaceId ?? "");
  const { data, isLoading, isError, error } = useChats(workspaceId ?? "");
  const createChat = useCreateChat(workspaceId ?? "");

  // Build agent name lookup
  const agentNameMap = new Map(
    agentsData?.agents.map((a) => [a.id, a.name]) ?? [],
  );

  const handleCreateChat = async () => {
    const newChat = await createChat.mutateAsync({});
    navigate(`/chat/${newChat.id}`);
  };

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
          <Button onClick={handleCreateChat} disabled={createChat.isPending}>
            <PlusIcon /> Chat
          </Button>
        </div>
      </div>

      {isLoading ? (
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
      ) : data?.chats.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {data?.chats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              agentName={
                chat.agentId ? agentNameMap.get(chat.agentId) : undefined
              }
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default ChatsPage;
