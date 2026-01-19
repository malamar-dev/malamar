import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Bot, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { useDeleteAgent, useReorderAgents } from '../hooks/use-agents';
import type { Agent } from '../types/agent.types';
import { AgentCard } from './AgentCard';
import { AgentModal } from './AgentModal';

interface AgentListProps {
  agents: Agent[];
  workspaceId: string;
}

interface SortableAgentProps {
  agent: Agent;
  index: number;
  totalAgents: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableAgent({
  agent,
  index,
  totalAgents,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SortableAgentProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agent.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AgentCard
        agent={agent}
        index={index}
        totalAgents={totalAgents}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function AgentList({ agents, workspaceId }: AgentListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>();
  const [deletingAgent, setDeletingAgent] = useState<Agent | undefined>();
  const [localAgents, setLocalAgents] = useState(agents);

  const reorderAgents = useReorderAgents(workspaceId);
  const deleteAgent = useDeleteAgent(workspaceId);

  // Sync local agents with props
  if (agents !== localAgents && !reorderAgents.isPending) {
    setLocalAgents(agents);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localAgents.findIndex((a) => a.id === active.id);
      const newIndex = localAgents.findIndex((a) => a.id === over.id);

      const newAgents = arrayMove(localAgents, oldIndex, newIndex);
      setLocalAgents(newAgents);

      try {
        await reorderAgents.mutateAsync(newAgents.map((a) => a.id));
      } catch {
        toast.error('Failed to reorder agents');
        setLocalAgents(agents);
      }
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newAgents = arrayMove(localAgents, index, index - 1);
    setLocalAgents(newAgents);

    try {
      await reorderAgents.mutateAsync(newAgents.map((a) => a.id));
    } catch {
      toast.error('Failed to reorder agents');
      setLocalAgents(agents);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === localAgents.length - 1) return;
    const newAgents = arrayMove(localAgents, index, index + 1);
    setLocalAgents(newAgents);

    try {
      await reorderAgents.mutateAsync(newAgents.map((a) => a.id));
    } catch {
      toast.error('Failed to reorder agents');
      setLocalAgents(agents);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;
    try {
      await deleteAgent.mutateAsync(deletingAgent.id);
      toast.success('Agent deleted successfully');
      setDeletingAgent(undefined);
    } catch {
      toast.error('Failed to delete agent');
    }
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingAgent(undefined);
    }
  };

  if (agents.length === 0) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No agents configured</AlertTitle>
          <AlertDescription>
            This workspace has no agents. Chat with Malamar to configure agents for this workspace.
          </AlertDescription>
        </Alert>
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Agents automate tasks in your workspace. Chat with Malamar to get started."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Agent list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localAgents.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {localAgents.map((agent, index) => (
              <SortableAgent
                key={agent.id}
                agent={agent}
                index={index}
                totalAgents={localAgents.length}
                onEdit={() => handleEdit(agent)}
                onDelete={() => setDeletingAgent(agent)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Agent modal */}
      <AgentModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        workspaceId={workspaceId}
        agent={editingAgent}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingAgent}
        onOpenChange={(open) => !open && setDeletingAgent(undefined)}
        title="Delete Agent"
        description={`Are you sure you want to delete "${deletingAgent?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={deleteAgent.isPending}
      />
    </div>
  );
}
