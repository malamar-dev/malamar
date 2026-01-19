import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/EmptyState';
import { TypeToConfirmDialog } from '@/components/TypeToConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useWorkspace } from '@/features/workspace/hooks/use-workspaces';

import { useDeleteDoneTasks } from '../hooks/use-tasks';
import type { Task, TaskStatus } from '../types/task.types';
import { KanbanColumn } from './KanbanColumn';
import { TaskCreateModal } from './TaskCreateModal';

interface KanbanBoardProps {
  tasks: Task[];
}

const statuses: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace } = useWorkspace(workspaceId!);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDoneDialogOpen, setIsDeleteDoneDialogOpen] = useState(false);
  const deleteDoneTasks = useDeleteDoneTasks(workspaceId!);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };

    for (const task of tasks) {
      grouped[task.status].push(task);
    }

    // Sort by most recently updated
    for (const status of statuses) {
      grouped[status].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    return grouped;
  }, [tasks]);

  const doneCount = tasksByStatus.done.length;

  const handleDeleteDone = async () => {
    try {
      await deleteDoneTasks.mutateAsync();
      toast.success('Done tasks deleted successfully');
      setIsDeleteDoneDialogOpen(false);
    } catch {
      toast.error('Failed to delete done tasks');
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
        <EmptyState
          title="No tasks yet"
          description="Create your first task to get started."
          action={{
            label: 'Create Task',
            onClick: () => setIsCreateModalOpen(true),
          }}
        />
        <TaskCreateModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setIsDeleteDoneDialogOpen(true)}
              disabled={doneCount === 0}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete all done tasks ({doneCount})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Kanban columns */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="flex gap-4 h-[calc(100vh-280px)] pb-4">
          {statuses.map((status) => (
            <KanbanColumn key={status} status={status} tasks={tasksByStatus[status]} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Modals */}
      <TaskCreateModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />

      <TypeToConfirmDialog
        open={isDeleteDoneDialogOpen}
        onOpenChange={setIsDeleteDoneDialogOpen}
        title="Delete all done tasks"
        description={`This will permanently delete all ${doneCount} done tasks. This action cannot be undone.`}
        confirmText={workspace?.title || 'delete'}
        confirmLabel="Delete Done Tasks"
        onConfirm={handleDeleteDone}
        isLoading={deleteDoneTasks.isPending}
      />
    </div>
  );
}
