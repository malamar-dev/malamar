import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ListTodoIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs.tsx";
import { useAgents } from "@/features/workspaces/hooks/use-agents.ts";
import { useWorkspace } from "@/features/workspaces/hooks/use-workspace.ts";

import { CreateTaskDialog } from "../../components/create-task-dialog.tsx";
import { DeleteDoneTasksDialog } from "../../components/delete-done-tasks-dialog.tsx";
import { TaskDetailDialog } from "../../components/task-detail-dialog.tsx";
import { TaskKanbanBoard } from "../../components/task-kanban-board.tsx";
import { useTasks } from "../../hooks/use-tasks.ts";
import type { Task } from "../../types/task.types.ts";

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <ListTodoIcon className="text-muted-foreground mb-4 h-12 w-12" />
      <p className="text-muted-foreground mb-4 text-lg">No tasks yet</p>
      <Button onClick={onCreateClick}>
        <PlusIcon /> Create Task
      </Button>
    </div>
  );
}

const TasksPage = () => {
  const { id: workspaceId } = useParams<{ id: string }>();
  const { data: workspace } = useWorkspace(workspaceId ?? "");
  const { data, isLoading, isError, error } = useTasks(workspaceId ?? "");
  const { data: agentsData } = useAgents(workspaceId ?? "");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDoneDialogOpen, setDeleteDoneDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const tasks = data?.tasks ?? [];
  const hasDoneTasks = tasks.some((t) => t.status === "done");
  const hasNoAgents = agentsData?.agents.length === 0;

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseDetail = () => {
    setSelectedTask(null);
  };

  return (
    <AppLayout
      breadcrumbItems={[
        { label: "Workspaces", href: "/workspaces" },
        { label: workspace?.title ?? "" },
      ]}
      variant="lg"
    >
      <div className="mb-4 flex items-center justify-start">
        <div>
          <WorkspaceTabs
            workspaceId={workspace?.id as string}
            currentPage="tasks"
          />
        </div>

        <div className="ml-auto flex gap-2">
          {hasDoneTasks && (
            <Button
              variant="outline"
              onClick={() => setDeleteDoneDialogOpen(true)}
            >
              <Trash2Icon /> Clear Done
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon /> Task
          </Button>
        </div>
      </div>

      {/* No Agents Warning */}
      {hasNoAgents && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangleIcon />
          <AlertTitle>No agents configured</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Tasks will be immediately moved to "In Review" without processing.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/workspaces/${workspaceId}/agents`}>
                Configure Agents
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p>{error?.message ?? "An unexpected error occurred"}</p>
          </AlertDescription>
        </Alert>
      ) : tasks.length === 0 ? (
        <EmptyState onCreateClick={() => setCreateDialogOpen(true)} />
      ) : (
        <TaskKanbanBoard tasks={tasks} onTaskClick={handleTaskClick} />
      )}

      {/* Dialogs */}
      <CreateTaskDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        workspaceId={workspaceId ?? ""}
      />

      <DeleteDoneTasksDialog
        open={deleteDoneDialogOpen}
        setOpen={setDeleteDoneDialogOpen}
        workspaceId={workspaceId ?? ""}
        workspaceName={workspace?.title ?? ""}
      />

      <TaskDetailDialog
        open={!!selectedTask}
        setOpen={(open) => !open && handleCloseDetail()}
        task={selectedTask}
        workspaceId={workspaceId ?? ""}
      />
    </AppLayout>
  );
};

export default TasksPage;
