import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  MessageSquareIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCreateChat } from "@/features/chats";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs.tsx";

import { AgentCliWarning } from "../../components/agent-cli-warning.tsx";
import { AgentDialog } from "../../components/agent-dialog.tsx";
import { DeleteAgentDialog } from "../../components/delete-agent-dialog.tsx";
import { SortableAgentItem } from "../../components/sortable-agent-item.tsx";
import { useAgents } from "../../hooks/use-agents.ts";
import { useReorderAgents } from "../../hooks/use-reorder-agents.ts";
import { useWorkspace } from "../../hooks/use-workspace.ts";
import type { Agent } from "../../types/agent.types.ts";

interface EmptyStateProps {
  onAddAgent: () => void;
  onChatWithMalamar: () => void;
}

function EmptyState({ onAddAgent, onChatWithMalamar }: EmptyStateProps) {
  return (
    <Alert variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>No agents configured</AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          This workspace has no agents. Tasks will be immediately moved to "In
          Review" without processing.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onAddAgent}>
            <PlusIcon /> Add Agent
          </Button>
          <Button size="sm" variant="outline" onClick={onChatWithMalamar}>
            <MessageSquareIcon /> Chat with Malamar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

const AgentsPage = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const { data: workspace } = useWorkspace(workspaceId ?? "");
  const { data, isLoading, isError, error } = useAgents(workspaceId ?? "");
  const reorderAgents = useReorderAgents(workspaceId ?? "");
  const createChat = useCreateChat(workspaceId ?? "");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);

  // dnd-kit sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !data?.agents) {
      return;
    }

    const oldIndex = data.agents.findIndex((agent) => agent.id === active.id);
    const newIndex = data.agents.findIndex((agent) => agent.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newAgentIds = arrayMove(
      data.agents.map((a) => a.id),
      oldIndex,
      newIndex,
    );

    reorderAgents.mutate({ agentIds: newAgentIds });
  };

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

  const handleChatWithMalamar = async () => {
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
        <EmptyState
          onAddAgent={() => setCreateDialogOpen(true)}
          onChatWithMalamar={handleChatWithMalamar}
        />
      ) : (
        <>
          <AgentCliWarning agents={data?.agents ?? []} />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={data?.agents.map((a) => a.id) ?? []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {data?.agents.map((agent, index) => (
                  <SortableAgentItem
                    key={agent.id}
                    id={agent.id}
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
            </SortableContext>
          </DndContext>
        </>
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
