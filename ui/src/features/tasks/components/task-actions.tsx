import {
  ArrowLeftIcon,
  BanIcon,
  CheckCircleIcon,
  LoaderIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button.tsx";

import { useCancelTask } from "../hooks/use-cancel-task.ts";
import { usePrioritizeTask } from "../hooks/use-prioritize-task.ts";
import { useUpdateTask } from "../hooks/use-update-task.ts";
import type { Task, TaskStatus } from "../types/task.types.ts";

interface TaskActionsProps {
  task: Task;
  workspaceId: string;
  onDeleteClick: () => void;
}

export function TaskActions({
  task,
  workspaceId,
  onDeleteClick,
}: TaskActionsProps) {
  const updateTask = useUpdateTask(workspaceId);
  const prioritizeTask = usePrioritizeTask(workspaceId);
  const cancelTask = useCancelTask(workspaceId);

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTask.mutate({ taskId: task.id, input: { status: newStatus } });
  };

  const handlePrioritize = () => {
    prioritizeTask.mutate({ taskId: task.id, isPriority: !task.isPriority });
  };

  const handleCancel = () => {
    cancelTask.mutate(task.id);
  };

  const isPending =
    updateTask.isPending || prioritizeTask.isPending || cancelTask.isPending;

  // Actions vary by status
  // Todo: Delete, Prioritize
  // In Progress: Delete, Cancel, Move to In Review, Prioritize
  // In Review: Delete, Move to Todo
  // Done: Delete, Move to Todo

  return (
    <div className="flex flex-wrap gap-2">
      {/* Delete - always available */}
      <Button
        variant="destructive"
        size="sm"
        onClick={onDeleteClick}
        disabled={isPending}
      >
        <Trash2Icon className="h-4 w-4" />
        Delete
      </Button>

      {/* Status-specific actions */}
      {task.status === "todo" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrioritize}
          disabled={isPending}
        >
          {prioritizeTask.isPending ? (
            <LoaderIcon className="h-4 w-4 animate-spin" />
          ) : task.isPriority ? (
            <StarOffIcon className="h-4 w-4" />
          ) : (
            <StarIcon className="h-4 w-4" />
          )}
          {task.isPriority ? "Remove Priority" : "Prioritize"}
        </Button>
      )}

      {task.status === "in_progress" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            {cancelTask.isPending ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <BanIcon className="h-4 w-4" />
            )}
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("in_review")}
            disabled={isPending}
          >
            {updateTask.isPending ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeftIcon className="h-4 w-4" />
            )}
            Move to In Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrioritize}
            disabled={isPending}
          >
            {prioritizeTask.isPending ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : task.isPriority ? (
              <StarOffIcon className="h-4 w-4" />
            ) : (
              <StarIcon className="h-4 w-4" />
            )}
            {task.isPriority ? "Remove Priority" : "Prioritize"}
          </Button>
        </>
      )}

      {task.status === "in_review" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("todo")}
            disabled={isPending}
          >
            {updateTask.isPending ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeftIcon className="h-4 w-4" />
            )}
            Move to Todo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("done")}
            disabled={isPending}
          >
            {updateTask.isPending ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-4 w-4" />
            )}
            Move to Done
          </Button>
        </>
      )}

      {task.status === "done" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStatusChange("todo")}
          disabled={isPending}
        >
          {updateTask.isPending ? (
            <LoaderIcon className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeftIcon className="h-4 w-4" />
          )}
          Move to Todo
        </Button>
      )}
    </div>
  );
}
