import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

import type { Task, TaskStatus } from "../types/task.types.ts";
import { TaskCard } from "./task-card.tsx";

interface TaskColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-slate-500",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-green-500",
};

export function TaskColumn({
  title,
  status,
  tasks,
  onTaskClick,
}: TaskColumnProps) {
  const count = tasks.length;

  return (
    <div className="bg-muted/30 flex min-h-[200px] flex-col rounded-lg p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", statusColors[status])} />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <Badge
          variant="secondary"
          className="h-5 min-w-[20px] justify-center px-1.5"
        >
          {count}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
    </div>
  );
}
