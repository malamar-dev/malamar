import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  MoreHorizontal,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorMessage } from '@/components/ErrorMessage';
import { Markdown } from '@/components/Markdown';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  useAddComment,
  useCancelTask,
  useDeleteTask,
  usePrioritizeTask,
  useTask,
  useTaskComments,
  useTaskLogs,
  useUpdateTask,
} from '../hooks/use-tasks';
import type { TaskStatus } from '../types/task.types';
import { ActivityLog } from './ActivityLog';
import { CommentInput } from './CommentInput';
import { CommentList } from './CommentList';

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const statusColors: Record<TaskStatus, string> = {
  todo: 'bg-slate-500',
  in_progress: 'bg-blue-500',
  in_review: 'bg-yellow-500',
  done: 'bg-green-500',
};

export function TaskDetailModal() {
  const { workspaceId, taskId } = useParams<{ workspaceId: string; taskId: string }>();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const { data: task, isLoading, error } = useTask(taskId!);
  const { data: comments = [] } = useTaskComments(taskId!);
  const { data: logs = [] } = useTaskLogs(taskId!);

  const updateTask = useUpdateTask(workspaceId!);
  const deleteTask = useDeleteTask(workspaceId!);
  const prioritizeTask = usePrioritizeTask(workspaceId!);
  const cancelTask = useCancelTask(workspaceId!);
  const addComment = useAddComment();

  const handleClose = () => {
    navigate(`/workspaces/${workspaceId}/tasks`);
  };

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(taskId!);
      toast.success('Task deleted');
      handleClose();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelTask.mutateAsync(taskId!);
      toast.success('Task cancelled');
      setIsCancelDialogOpen(false);
    } catch {
      toast.error('Failed to cancel task');
    }
  };

  const handlePriorityToggle = async () => {
    if (!task) return;
    try {
      await prioritizeTask.mutateAsync({ id: taskId!, prioritize: !task.is_prioritized });
      toast.success(task.is_prioritized ? 'Priority removed' : 'Task prioritized');
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: taskId!, data: { status: newStatus } });
      toast.success(`Moved to ${statusLabels[newStatus]}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAddComment = async (content: string) => {
    try {
      await addComment.mutateAsync({ taskId: taskId!, content });
    } catch {
      toast.error('Failed to add comment');
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          {isLoading && (
            <div className="p-6">
              <FormSkeleton fields={4} />
            </div>
          )}

          {error && (
            <div className="p-6">
              <ErrorMessage error={error} />
            </div>
          )}

          {task && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[task.status]}>
                        {statusLabels[task.status]}
                      </Badge>
                      {task.is_prioritized && (
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Priority
                        </Badge>
                      )}
                    </div>
                    <DialogTitle className="text-xl">{task.summary}</DialogTitle>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handlePriorityToggle}>
                        <Star className="h-4 w-4 mr-2" />
                        {task.is_prioritized ? 'Remove priority' : 'Prioritize'}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* Status changes based on current status */}
                      {task.status === 'in_progress' && (
                        <>
                          <DropdownMenuItem onClick={() => handleStatusChange('in_review')}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Move to In Review
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsCancelDialogOpen(true)}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </>
                      )}

                      {task.status === 'in_review' && (
                        <>
                          <DropdownMenuItem onClick={() => handleStatusChange('done')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Move to Done
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Move to Todo
                          </DropdownMenuItem>
                        </>
                      )}

                      {task.status === 'done' && (
                        <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Move to Todo
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DialogHeader>

              <Separator />

              <ScrollArea className="flex-1">
                <div className="px-6 py-4">
                  {/* Description */}
                  {task.description ? (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-2">Description</h3>
                      <Markdown content={task.description} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-6 italic">
                      No description
                    </p>
                  )}

                  {/* Comments and Activity tabs */}
                  <Tabs defaultValue="comments">
                    <TabsList>
                      <TabsTrigger value="comments">
                        Comments ({comments.length})
                      </TabsTrigger>
                      <TabsTrigger value="activity">
                        Activity ({logs.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="comments" className="mt-4">
                      <CommentList comments={comments} />
                    </TabsContent>

                    <TabsContent value="activity" className="mt-4">
                      <ActivityLog logs={logs} />
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>

              {/* Comment input */}
              <div className="px-6 py-4 border-t flex-shrink-0">
                <CommentInput onSubmit={handleAddComment} isLoading={addComment.isPending} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={deleteTask.isPending}
      />

      <ConfirmDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="Cancel Task"
        description="Are you sure you want to cancel this task? The agent will stop working on it."
        confirmLabel="Cancel Task"
        onConfirm={handleCancel}
        variant="destructive"
        isLoading={cancelTask.isPending}
      />
    </>
  );
}
