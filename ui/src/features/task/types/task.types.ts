export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface Task {
  id: string;
  workspace_id: string;
  summary: string;
  description?: string;
  status: TaskStatus;
  is_prioritized: boolean;
  created_at: string;
  updated_at: string;
}

export type CommentAuthorType = 'user' | 'agent' | 'system';

export interface TaskComment {
  id: string;
  task_id: string;
  author_type: CommentAuthorType;
  author_name?: string;
  content: string;
  created_at: string;
}

export interface TaskLog {
  id: string;
  task_id: string;
  event_type: string;
  description: string;
  created_at: string;
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
