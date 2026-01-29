import { LoaderIcon, MessageSquareIcon, StarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { formatFullTimestamp, formatRelativeTime } from "@/lib/date-utils.ts";
import { cn } from "@/lib/utils.ts";

import type { Task } from "../types/task.types.ts";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const isProcessing = task.status === "in_progress";
  const commentCount = task.commentCount ?? 0;
  const isPriority = task.isPriority ?? false;

  return (
    <Card
      className={cn(
        "hover:bg-accent/50 cursor-pointer transition-colors",
        isProcessing && "border-primary animate-pulse",
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm font-medium">
            {task.summary}
          </CardTitle>
          {isPriority && (
            <Badge
              variant="default"
              className="h-5 shrink-0 gap-1 px-1.5 text-xs"
            >
              <StarIcon className="h-3 w-3" />
              Priority
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  {formatRelativeTime(task.updatedAt)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formatFullTimestamp(task.updatedAt)}</p>
              </TooltipContent>
            </Tooltip>
            {commentCount > 0 && (
              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-xs">
                <MessageSquareIcon className="h-3 w-3" />
                {commentCount}
              </Badge>
            )}
          </div>
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
