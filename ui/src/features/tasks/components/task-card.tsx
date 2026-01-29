import { LoaderIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { formatRelativeTime } from "@/lib/date-utils.ts";
import { cn } from "@/lib/utils.ts";

import type { Task } from "../types/task.types.ts";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const isProcessing = task.status === "in_progress";

  return (
    <Card
      className={cn(
        "hover:bg-accent/50 cursor-pointer transition-colors",
        isProcessing && "border-primary animate-pulse",
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2 text-sm font-medium">
          {task.summary}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{formatRelativeTime(task.updatedAt)}</span>
          {isProcessing && (
            <span className="text-primary flex items-center gap-1">
              <LoaderIcon className="h-3 w-3 animate-spin" />
              Processing
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
