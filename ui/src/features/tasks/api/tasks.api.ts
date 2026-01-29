import { apiClient } from "@/lib/api-client.ts";

import type {
  CommentsResponse,
  CreateCommentInput,
  CreateTaskInput,
  LogsResponse,
  Task,
  TaskComment,
  TasksResponse,
  UpdateTaskInput,
} from "../types/task.types.ts";

export const tasksApi = {
  /**
   * Fetches all tasks for a workspace.
   * @param workspaceId - The workspace ID to fetch tasks for
   * @returns List of tasks
   */
  list: (workspaceId: string) =>
    apiClient.get<TasksResponse>(`/workspaces/${workspaceId}/tasks`),

  /**
   * Fetches a single task by its ID.
   * @param id - The task ID
   * @returns The task details
   */
  get: (id: string) => apiClient.get<Task>(`/tasks/${id}`),

  /**
   * Creates a new task in a workspace.
   * @param workspaceId - The workspace ID to create the task in
   * @param input - The task creation data
   * @returns The newly created task
   */
  create: (workspaceId: string, input: CreateTaskInput) =>
    apiClient.post<Task>(`/workspaces/${workspaceId}/tasks`, input),

  /**
   * Updates an existing task.
   * @param id - The task ID
   * @param input - The update data
   * @returns The updated task
   */
  update: (id: string, input: UpdateTaskInput) =>
    apiClient.put<Task>(`/tasks/${id}`, input),

  /**
   * Deletes a task.
   * @param id - The task ID
   * @returns Success status
   */
  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/tasks/${id}`),

  /**
   * Prioritizes a task (moves it to front of queue).
   * @param id - The task ID
   * @returns The updated task
   */
  prioritize: (id: string) =>
    apiClient.post<Task>(`/tasks/${id}/prioritize`, {}),

  /**
   * Cancels a running task (kills CLI subprocess, moves to In Review).
   * @param id - The task ID
   * @returns Success status
   */
  cancel: (id: string) =>
    apiClient.post<{ success: boolean }>(`/tasks/${id}/cancel`, {}),

  /**
   * Deletes all done tasks in a workspace.
   * @param workspaceId - The workspace ID
   * @returns Success status with count of deleted tasks
   */
  deleteDone: (workspaceId: string) =>
    apiClient.delete<{ success: boolean; deletedCount: number }>(
      `/workspaces/${workspaceId}/tasks/done`,
    ),

  /**
   * Fetches comments for a task.
   * @param taskId - The task ID
   * @returns List of comments
   */
  getComments: (taskId: string) =>
    apiClient.get<CommentsResponse>(`/tasks/${taskId}/comments`),

  /**
   * Adds a comment to a task.
   * @param taskId - The task ID
   * @param input - The comment content
   * @returns The newly created comment
   */
  createComment: (taskId: string, input: CreateCommentInput) =>
    apiClient.post<TaskComment>(`/tasks/${taskId}/comments`, input),

  /**
   * Fetches activity logs for a task.
   * @param taskId - The task ID
   * @returns List of activity logs
   */
  getLogs: (taskId: string) =>
    apiClient.get<LogsResponse>(`/tasks/${taskId}/logs`),
};
