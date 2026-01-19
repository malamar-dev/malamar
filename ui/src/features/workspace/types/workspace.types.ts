export type WorkingDirectoryMode = 'static' | 'temp';

export interface Workspace {
  id: string;
  title: string;
  description?: string;
  working_directory_mode: WorkingDirectoryMode;
  working_directory_path?: string;
  auto_delete_done_tasks: boolean;
  done_task_retention_days?: number;
  notify_on_error: boolean;
  notify_on_in_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceInput {
  title: string;
  description?: string;
}

export interface UpdateWorkspaceInput {
  title?: string;
  description?: string;
  working_directory_mode?: WorkingDirectoryMode;
  working_directory_path?: string;
  auto_delete_done_tasks?: boolean;
  done_task_retention_days?: number;
  notify_on_error?: boolean;
  notify_on_in_review?: boolean;
}
