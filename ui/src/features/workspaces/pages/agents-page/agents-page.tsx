import { AlertCircleIcon, BotIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDocumentTitle } from "@/hooks/use-document-title.ts";
import { useCreateChat } from "@/features/chats";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs.tsx";

import { AgentDialog } from "../../components/agent-dialog.tsx";
import { AgentItem } from "../../components/agent-item.tsx";
import { DeleteAgentDialog } from "../../components/delete-agent-dialog.tsx";
import { useAgents } from "../../hooks/use-agents.ts";
import { useReorderAgents } from "../../hooks/use-reorder-agents.ts";
import { useWorkspace } from "../../hooks/use-workspace.ts";
import type { Agent } from "../../types/agent.types.ts";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <BotIcon className="text-muted-foreground mb-4 h-12 w-12" />
      <p className="text-muted-foreground mb-4 text-lg">No agents yet</p>
    </div>
  );
}

const AgentsPage = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const { data: workspace } = useWorkspace(workspaceId ?? "");
  const { data, isLoading, isError, error } = useAgents(workspaceId ?? "");
  const reorderAgents = useReorderAgents(workspaceId ?? "");
  const createChat = useCreateChat(workspaceId ?? "");

  useDocumentTitle(workspace?.title ? `Agents - ${workspace.title}` : "Agents");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);

  const handleMoveUp = (agent: Agent) => {
    if (!data?.agents) return;
    const agents = data.agents;
    const index = agents.findIndex((a) => a.id === agent.id);
    if (index <= 0) return;

    const newAgentIds = agents.map((a) => a.id);
    [newAgentIds[index - 1], newAgentIds[index]] = [
      newAgentIds[index],
      newAgentIds[index - 1],
    ];

    reorderAgents.mutate({ agentIds: newAgentIds });
  };

  const handleMoveDown = (agent: Agent) => {
    if (!data?.agents) return;
    const agents = data.agents;
    const index = agents.findIndex((a) => a.id === agent.id);
    if (index < 0 || index >= agents.length - 1) return;

    const newAgentIds = agents.map((a) => a.id);
    [newAgentIds[index], newAgentIds[index + 1]] = [
      newAgentIds[index + 1],
      newAgentIds[index],
    ];

    reorderAgents.mutate({ agentIds: newAgentIds });
  };

  const handleChat = async (agent: Agent) => {
    const newChat = await createChat.mutateAsync({ agentId: agent.id });
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
            currentPage="agents"
          />
        </div>

        <div className="ml-auto">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon /> Agent
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
      ) : data?.agents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {data?.agents.map((agent, index) => (
            <AgentItem
              key={agent.id}
              agent={agent}
              isFirst={index === 0}
              isLast={index === data.agents.length - 1}
              onEdit={setEditAgent}
              onDelete={setDeleteAgent}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onChat={handleChat}
            />
          ))}
        </div>
      )}

      <AgentDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        workspaceId={workspaceId ?? ""}
      />

      <AgentDialog
        open={!!editAgent}
        setOpen={(open) => !open && setEditAgent(null)}
        workspaceId={workspaceId ?? ""}
        agent={editAgent}
      />

      <DeleteAgentDialog
        open={!!deleteAgent}
        setOpen={(open) => !open && setDeleteAgent(null)}
        workspaceId={workspaceId ?? ""}
        agent={deleteAgent}
      />
    </AppLayout>
  );
};

export default AgentsPage;
