import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useCreateWorkspace } from '../hooks/use-workspaces';
import { WorkspaceForm, type WorkspaceFormValues } from './WorkspaceForm';

interface WorkspaceCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceCreateModal({ open, onOpenChange }: WorkspaceCreateModalProps) {
  const createWorkspace = useCreateWorkspace();

  const handleSubmit = async (values: WorkspaceFormValues) => {
    try {
      await createWorkspace.mutateAsync(values);
      toast.success('Workspace created successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create workspace');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>Create a new workspace to organize your tasks and agents.</DialogDescription>
        </DialogHeader>
        <WorkspaceForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={createWorkspace.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
