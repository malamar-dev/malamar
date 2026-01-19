import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useCreateTask } from '../hooks/use-tasks';
import { TaskForm, type TaskFormValues } from './TaskForm';

interface TaskCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskCreateModal({ open, onOpenChange }: TaskCreateModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const createTask = useCreateTask(workspaceId!);

  const handleSubmit = async (values: TaskFormValues) => {
    try {
      await createTask.mutateAsync(values);
      toast.success('Task created successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create task');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Create a new task for agents to work on.</DialogDescription>
        </DialogHeader>
        <TaskForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={createTask.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
