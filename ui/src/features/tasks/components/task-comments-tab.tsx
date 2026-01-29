import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, LoaderIcon, SendIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { formatFullTimestamp, formatRelativeTime } from "@/lib/date-utils.ts";
import { cn } from "@/lib/utils.ts";

import { useComments } from "../hooks/use-comments.ts";
import { useCreateComment } from "../hooks/use-create-comment.ts";
import type { Task, TaskComment } from "../types/task.types.ts";

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface TaskCommentsTabProps {
  task: Task;
  workspaceId: string;
}

function CommentItem({ comment }: { comment: TaskComment }) {
  const authorName = comment.authorName ?? "Unknown";
  const authorType = comment.authorType ?? "system";

  return (
    <div className="border-b pb-4 last:border-b-0">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "text-sm font-medium",
            authorType === "user" && "text-primary",
            authorType === "agent" && "text-blue-600 dark:text-blue-400",
            authorType === "system" && "text-muted-foreground",
          )}
        >
          {authorName}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground cursor-default text-xs">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{formatFullTimestamp(comment.createdAt)}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
    </div>
  );
}

export function TaskCommentsTab({ task, workspaceId }: TaskCommentsTabProps) {
  const { data, isLoading, isError, error } = useComments(task.id);
  const createComment = useCreateComment(task.id, workspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = async (formData: CommentFormData) => {
    await createComment.mutateAsync({ content: formData.content });
    reset();
  };

  const comments = data?.comments ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Comments list */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Failed to load comments</AlertTitle>
            <AlertDescription>
              {error?.message ?? "An unexpected error occurred"}
            </AlertDescription>
          </Alert>
        ) : comments.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No comments yet. Add a comment to provide feedback or instructions.
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>

      {/* Comment input */}
      <form className="border-t pt-4" onSubmit={handleSubmit(onSubmit)}>
        <Textarea
          placeholder="Add a comment..."
          rows={3}
          aria-invalid={!!errors.content}
          {...register("content")}
        />
        {errors.content && (
          <p className="text-destructive mt-1 text-sm">
            {errors.content.message}
          </p>
        )}
        <div className="mt-2 flex justify-end">
          <Button type="submit" disabled={createComment.isPending}>
            {createComment.isPending ? (
              <LoaderIcon className="animate-spin" />
            ) : (
              <SendIcon />
            )}
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
