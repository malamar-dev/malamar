import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useCreateAgent, useDeleteAgent, useUpdateAgent } from '../hooks/use-agents';
import type { Agent } from '../types/agent.types';
import { AgentForm, type AgentFormValues } from './AgentForm';

interface AgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  agent?: Agent;
}

export function AgentModal({ open, onOpenChange, workspaceId, agent }: AgentModalProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const createAgent = useCreateAgent(workspaceId);
  const updateAgent = useUpdateAgent(workspaceId);
  const deleteAgent = useDeleteAgent(workspaceId);

  const isEditing = !!agent;

  const handleSubmit = async (values: AgentFormValues) => {
    try {
      if (isEditing) {
        await updateAgent.mutateAsync({ id: agent.id, data: values });
        toast.success('Agent updated successfully');
      } else {
        await createAgent.mutateAsync(values);
        toast.success('Agent created successfully');
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? 'Failed to update agent' : 'Failed to create agent');
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    try {
      await deleteAgent.mutateAsync(agent.id);
      toast.success('Agent deleted successfully');
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
    } catch {
      toast.error('Failed to delete agent');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Agent' : 'Create Agent'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the agent configuration.'
                : 'Create a new agent for this workspace.'}
            </DialogDescription>
          </DialogHeader>
          <AgentForm
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            defaultValues={
              agent
                ? {
                    name: agent.name,
                    cli_type: agent.cli_type,
                    instruction: agent.instruction,
                  }
                : undefined
            }
            isLoading={createAgent.isPending || updateAgent.isPending}
          />
          {isEditing && (
            <div className="border-t pt-4 mt-2">
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full"
              >
                Delete Agent
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Agent"
        description={`Are you sure you want to delete "${agent?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={deleteAgent.isPending}
      />
    </>
  );
}
