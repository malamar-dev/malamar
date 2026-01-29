import {
  AlertCircleIcon,
  BanIcon,
  CheckIcon,
  MessageSquareIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
  StarOffIcon,
  UserIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatRelativeTime } from "@/lib/date-utils.ts";
import { cn } from "@/lib/utils.ts";

import { useLogs } from "../hooks/use-logs.ts";
import type { Task, TaskEventType, TaskLog } from "../types/task.types.ts";

interface TaskActivityTabProps {
  task: Task;
}

const eventIcons: Record<TaskEventType, ReactNode> = {
  task_created: <PlusIcon className="h-4 w-4" />,
  status_changed: <CheckIcon className="h-4 w-4" />,
  comment_added: <MessageSquareIcon className="h-4 w-4" />,
  agent_started: <PlayIcon className="h-4 w-4" />,
  agent_finished: <CheckIcon className="h-4 w-4" />,
  task_cancelled: <BanIcon className="h-4 w-4" />,
  task_prioritized: <StarIcon className="h-4 w-4" />,
  task_deprioritized: <StarOffIcon className="h-4 w-4" />,
};

const eventColors: Record<TaskEventType, string> = {
  task_created: "text-green-600 dark:text-green-400",
  status_changed: "text-blue-600 dark:text-blue-400",
  comment_added: "text-purple-600 dark:text-purple-400",
  agent_started: "text-amber-600 dark:text-amber-400",
  agent_finished: "text-green-600 dark:text-green-400",
  task_cancelled: "text-red-600 dark:text-red-400",
  task_prioritized: "text-yellow-600 dark:text-yellow-400",
  task_deprioritized: "text-muted-foreground",
};

function formatStatusChange(oldStatus?: string, newStatus?: string): string {
  const formatStatus = (s?: string) => s?.replace(/_/g, " ") ?? "unknown";
  return `Status changed from ${formatStatus(oldStatus)} to ${formatStatus(newStatus)}`;
}

function formatEventDescription(log: TaskLog): string {
  switch (log.eventType) {
    case "task_created":
      return "Task created";
    case "status_changed":
      return formatStatusChange(
        log.metadata?.oldStatus,
        log.metadata?.newStatus,
      );
    case "comment_added":
      return "Comment added";
    case "agent_started":
      return `${log.metadata?.agentName ?? "Agent"} started processing`;
    case "agent_finished": {
      const agentName = log.metadata?.agentName ?? "Agent";
      const actionType = log.metadata?.actionType;
      if (actionType === "skip") {
        return `${agentName} finished (skipped)`;
      } else if (actionType === "comment") {
        return `${agentName} finished (commented)`;
      } else if (actionType === "in_review") {
        return `${agentName} finished (moved to in review)`;
      }
      return `${agentName} finished`;
    }
    case "task_cancelled":
      return "Task cancelled";
    case "task_prioritized":
      return "Task prioritized";
    case "task_deprioritized":
      return "Priority removed";
    default:
      return log.eventType;
  }
}

function ActivityItem({ log }: { log: TaskLog }) {
  const icon = eventIcons[log.eventType] ?? <UserIcon className="h-4 w-4" />;
  const colorClass = eventColors[log.eventType] ?? "text-muted-foreground";
  const description = formatEventDescription(log);

  return (
    <div className="flex items-start gap-3 border-b pb-3 last:border-b-0">
      <div className={cn("mt-0.5", colorClass)}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm">{description}</p>
        <p className="text-muted-foreground text-xs">
          {formatRelativeTime(log.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function TaskActivityTab({ task }: TaskActivityTabProps) {
  const { data, isLoading, isError, error } = useLogs(task.id);

  const logs = data?.logs ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Failed to load activity</AlertTitle>
        <AlertDescription>
          {error?.message ?? "An unexpected error occurred"}
        </AlertDescription>
      </Alert>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No activity recorded yet.
      </div>
    );
  }

  // Show oldest first for chronological timeline view
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="space-y-3">
      {sortedLogs.map((log) => (
        <ActivityItem key={log.id} log={log} />
      ))}
    </div>
  );
}
