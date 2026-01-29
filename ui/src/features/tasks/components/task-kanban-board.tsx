import { useMemo } from "react";

import type { Task, TaskStatus } from "../types/task.types.ts";
import { TaskColumn } from "./task-column.tsx";

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

interface ColumnConfig {
  status: TaskStatus;
  title: string;
}

const columns: ColumnConfig[] = [
  { status: "todo", title: "Todo" },
  { status: "in_progress", title: "In Progress" },
  { status: "in_review", title: "In Review" },
  { status: "done", title: "Done" },
];

export function TaskKanbanBoard({ tasks, onTaskClick }: TaskKanbanBoardProps) {
  // Group tasks by status and sort by most recently updated
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

    // Sort each column by updated_at (most recent first)
    for (const status of Object.keys(grouped) as TaskStatus[]) {
      grouped[status].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    return grouped;
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {columns.map((column) => (
        <TaskColumn
          key={column.status}
          title={column.title}
          status={column.status}
          tasks={tasksByStatus[column.status]}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}
