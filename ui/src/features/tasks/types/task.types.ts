// =============================================================================
// Task Status
// =============================================================================

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";

// =============================================================================
// Task
// =============================================================================

export interface Task {
  id: string;
  workspaceId: string;
  summary: string;
  description: string;
  status: TaskStatus;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  tasks: Task[];
}

export interface CreateTaskInput {
  summary: string;
  description?: string;
}

export interface UpdateTaskInput {
  summary?: string;
  description?: string;
  status?: TaskStatus;
}

// =============================================================================
// Task Comments
// =============================================================================

export type CommentAuthorType = "user" | "agent" | "system";

export interface TaskComment {
  id: string;
  taskId: string;
  workspaceId: string;
  userId: string | null;
  agentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** Computed author name for display (agent name, "You", or "System") */
  authorName?: string;
  /** Computed author type for styling */
  authorType?: CommentAuthorType;
}

export interface CommentsResponse {
  comments: TaskComment[];
}

export interface CreateCommentInput {
  content: string;
}

// =============================================================================
// Task Activity Logs
// =============================================================================

export type ActorType = "user" | "agent" | "system";

export type TaskEventType =
  | "task_created"
  | "status_changed"
  | "comment_added"
  | "agent_started"
  | "agent_finished"
  | "task_cancelled"
  | "task_prioritized"
  | "task_deprioritized";

export interface TaskLogMetadata {
  old_status?: TaskStatus;
  new_status?: TaskStatus;
  agent_name?: string;
  action_type?: "skip" | "comment" | "in_review";
}

export interface TaskLog {
  id: string;
  taskId: string;
  workspaceId: string;
  eventType: TaskEventType;
  actorType: ActorType;
  actorId: string | null;
  metadata: TaskLogMetadata | null;
  createdAt: string;
}

export interface LogsResponse {
  logs: TaskLog[];
}
