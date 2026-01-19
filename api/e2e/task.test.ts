import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { Task, TaskComment, TaskLog } from '../src/task/types.ts';
import type { Workspace } from '../src/workspace/types.ts';
import {
  del,
  get,
  getDb,
  post,
  put,
  resetDbConnection,
  startServer,
  stopServer,
} from './helpers/index.ts';

interface TaskResponse {
  data: Task;
}

interface TaskListResponse {
  data: Task[];
}

interface TaskCommentResponse {
  data: TaskComment;
}

interface TaskCommentListResponse {
  data: TaskComment[];
}

interface TaskLogListResponse {
  data: TaskLog[];
}

interface WorkspaceResponse {
  data: Workspace;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface SuccessResponse {
  success: boolean;
}

interface DeletedResponse {
  deleted: number;
}

describe('Task E2E Tests', () => {
  let testWorkspaceId: string;

  beforeAll(async () => {
    await startServer();

    // Create a workspace for task tests
    const { data } = await post<WorkspaceResponse>('/api/workspaces', {
      title: 'Task Test Workspace',
    });
    testWorkspaceId = data.data.id;
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('POST /api/workspaces/:id/tasks', () => {
    test('should create a task with required fields', async () => {
      const { status, data } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Test Task',
        }
      );

      expect(status).toBe(201);
      expect(data.data.summary).toBe('Test Task');
      expect(data.data.id).toBeDefined();
      expect(data.data.workspaceId).toBe(testWorkspaceId);
      expect(data.data.status).toBe('todo');
      expect(data.data.description).toBe('');
    });

    test('should create a task with description', async () => {
      const { status, data } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with description',
          description: 'This is a detailed description',
        }
      );

      expect(status).toBe(201);
      expect(data.data.summary).toBe('Task with description');
      expect(data.data.description).toBe('This is a detailed description');
    });

    test('should fail without summary', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/tasks`, {});

      expect(status).toBe(400);
    });

    test('should fail with empty summary', async () => {
      const { status } = await post<unknown>(`/api/workspaces/${testWorkspaceId}/tasks`, {
        summary: '',
      });

      expect(status).toBe(400);
    });

    test('should verify task exists in database', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'DB Verify Task',
        }
      );

      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string; summary: string; workspace_id: string }, [string]>(
          'SELECT id, summary, workspace_id FROM tasks WHERE id = ?'
        )
        .get(createData.data.id);

      expect(row).not.toBeNull();
      expect(row?.summary).toBe('DB Verify Task');
      expect(row?.workspace_id).toBe(testWorkspaceId);
    });

    test('should create task queue item when creating task', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with queue item',
        }
      );

      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string; task_id: string; status: string }, [string]>(
          'SELECT id, task_id, status FROM task_queue WHERE task_id = ?'
        )
        .get(createData.data.id);

      expect(row).not.toBeNull();
      expect(row?.task_id).toBe(createData.data.id);
      expect(row?.status).toBe('queued');
    });

    test('should create task_created log when creating task', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with log',
        }
      );

      const { status, data } = await get<TaskLogListResponse>(
        `/api/tasks/${createData.data.id}/logs`
      );

      expect(status).toBe(200);
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      expect(data.data.some((log) => log.eventType === 'task_created')).toBe(true);
    });
  });

  describe('GET /api/workspaces/:id/tasks', () => {
    test('should list tasks in workspace', async () => {
      // Create a fresh workspace with known tasks
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'List Tasks Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create tasks
      await post<TaskResponse>(`/api/workspaces/${workspaceId}/tasks`, {
        summary: 'List Task 1',
      });
      await post<TaskResponse>(`/api/workspaces/${workspaceId}/tasks`, {
        summary: 'List Task 2',
      });

      const { status, data } = await get<TaskListResponse>(`/api/workspaces/${workspaceId}/tasks`);

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.data.some((t) => t.summary === 'List Task 1')).toBe(true);
      expect(data.data.some((t) => t.summary === 'List Task 2')).toBe(true);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });

    test('should return empty array for workspace with no tasks', async () => {
      // Create a fresh workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Empty Tasks Workspace',
      });
      const workspaceId = wsData.data.id;

      const { status, data } = await get<TaskListResponse>(`/api/workspaces/${workspaceId}/tasks`);

      expect(status).toBe(200);
      expect(data.data.length).toBe(0);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });
  });

  describe('GET /api/tasks/:id', () => {
    test('should get a task by id', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Get By ID Task',
        }
      );

      const { status, data } = await get<TaskResponse>(`/api/tasks/${createData.data.id}`);

      expect(status).toBe(200);
      expect(data.data.id).toBe(createData.data.id);
      expect(data.data.summary).toBe('Get By ID Task');
    });

    test('should return 404 for non-existent task', async () => {
      const { status, data } = await get<ErrorResponse>('/api/tasks/nonexistent-id');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    test('should update task summary', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Original Summary',
        }
      );

      const { status, data } = await put<TaskResponse>(`/api/tasks/${createData.data.id}`, {
        summary: 'Updated Summary',
      });

      expect(status).toBe(200);
      expect(data.data.summary).toBe('Updated Summary');
    });

    test('should update task description', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Description Update Task',
        }
      );

      const { status, data } = await put<TaskResponse>(`/api/tasks/${createData.data.id}`, {
        description: 'Updated description',
      });

      expect(status).toBe(200);
      expect(data.data.description).toBe('Updated description');
      expect(data.data.summary).toBe('Description Update Task'); // unchanged
    });

    test('should update task status', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Status Update Task',
        }
      );

      // Update to in_progress
      const { status: status1, data: data1 } = await put<TaskResponse>(
        `/api/tasks/${createData.data.id}`,
        {
          status: 'in_progress',
        }
      );

      expect(status1).toBe(200);
      expect(data1.data.status).toBe('in_progress');

      // Update to in_review
      const { status: status2, data: data2 } = await put<TaskResponse>(
        `/api/tasks/${createData.data.id}`,
        {
          status: 'in_review',
        }
      );

      expect(status2).toBe(200);
      expect(data2.data.status).toBe('in_review');

      // Update to done
      const { status: status3, data: data3 } = await put<TaskResponse>(
        `/api/tasks/${createData.data.id}`,
        {
          status: 'done',
        }
      );

      expect(status3).toBe(200);
      expect(data3.data.status).toBe('done');
    });

    test('should update multiple fields', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Multi Update Task',
        }
      );

      const { status, data } = await put<TaskResponse>(`/api/tasks/${createData.data.id}`, {
        summary: 'New Summary',
        description: 'New description',
        status: 'in_progress',
      });

      expect(status).toBe(200);
      expect(data.data.summary).toBe('New Summary');
      expect(data.data.description).toBe('New description');
      expect(data.data.status).toBe('in_progress');
    });

    test('should return 404 for non-existent task', async () => {
      const { status, data } = await put<ErrorResponse>('/api/tasks/nonexistent-id', {
        summary: 'New Summary',
      });

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should fail with invalid status', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Invalid Status Task',
        }
      );

      const { status } = await put<unknown>(`/api/tasks/${createData.data.id}`, {
        status: 'invalid_status',
      });

      expect(status).toBe(400);
    });

    test('should log status_changed event when status changes', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Status Change Log Task',
        }
      );

      // Change status
      await put<TaskResponse>(`/api/tasks/${createData.data.id}`, {
        status: 'in_progress',
      });

      const { data: logData } = await get<TaskLogListResponse>(
        `/api/tasks/${createData.data.id}/logs`
      );

      expect(logData.data.some((log) => log.eventType === 'status_changed')).toBe(true);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    test('should delete a task', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'To Be Deleted',
        }
      );

      const { status, data } = await del<SuccessResponse>(`/api/tasks/${createData.data.id}`);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify it's gone from database
      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ id: string }, [string]>('SELECT id FROM tasks WHERE id = ?')
        .get(createData.data.id);
      expect(row).toBeNull();
    });

    test('should return 404 for non-existent task', async () => {
      const { status, data } = await del<ErrorResponse>('/api/tasks/nonexistent-id');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should cascade delete task comments', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with Comments',
        }
      );

      // Add a comment
      await post<TaskCommentResponse>(`/api/tasks/${createData.data.id}/comments`, {
        content: 'Test comment',
      });

      // Verify comment exists
      resetDbConnection();
      const dbBefore = getDb();
      const commentBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM task_comments WHERE task_id = ?')
        .get(createData.data.id);
      expect(commentBefore).not.toBeNull();

      // Delete task
      await del(`/api/tasks/${createData.data.id}`);

      // Verify comment is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const commentAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM task_comments WHERE task_id = ?')
        .get(createData.data.id);
      expect(commentAfter).toBeNull();
    });

    test('should cascade delete task logs', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with Logs',
        }
      );

      // Verify log exists (task_created)
      resetDbConnection();
      const dbBefore = getDb();
      const logBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM task_logs WHERE task_id = ?')
        .get(createData.data.id);
      expect(logBefore).not.toBeNull();

      // Delete task
      await del(`/api/tasks/${createData.data.id}`);

      // Verify log is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const logAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM task_logs WHERE task_id = ?')
        .get(createData.data.id);
      expect(logAfter).toBeNull();
    });

    test('should cascade delete task queue item', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with Queue Item',
        }
      );

      // Verify queue item exists
      resetDbConnection();
      const dbBefore = getDb();
      const queueBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM task_queue WHERE task_id = ?')
        .get(createData.data.id);
      expect(queueBefore).not.toBeNull();

      // Delete task
      await del(`/api/tasks/${createData.data.id}`);

      // Verify queue item is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const queueAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM task_queue WHERE task_id = ?')
        .get(createData.data.id);
      expect(queueAfter).toBeNull();
    });
  });

  describe('POST /api/tasks/:id/prioritize', () => {
    test('should prioritize a task', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Priority Task',
        }
      );

      const { status, data } = await post<SuccessResponse>(
        `/api/tasks/${createData.data.id}/prioritize`
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify in database
      resetDbConnection();
      const db = getDb();
      const row = db
        .query<{ is_priority: number }, [string]>('SELECT is_priority FROM task_queue WHERE task_id = ?')
        .get(createData.data.id);
      expect(row?.is_priority).toBe(1);
    });

    test('should return 404 for non-existent task', async () => {
      const { status, data } = await post<ErrorResponse>('/api/tasks/nonexistent-id/prioritize');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should log task_prioritized event', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Priority Log Task',
        }
      );

      await post<SuccessResponse>(`/api/tasks/${createData.data.id}/prioritize`);

      const { data: logData } = await get<TaskLogListResponse>(
        `/api/tasks/${createData.data.id}/logs`
      );

      expect(logData.data.some((log) => log.eventType === 'task_prioritized')).toBe(true);
    });
  });

  describe('POST /api/tasks/:id/cancel', () => {
    test('should cancel a task', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Cancel Task',
        }
      );

      const { status, data } = await post<SuccessResponse>(
        `/api/tasks/${createData.data.id}/cancel`
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify status changed to in_review
      const { data: taskData } = await get<TaskResponse>(`/api/tasks/${createData.data.id}`);
      expect(taskData.data.status).toBe('in_review');
    });

    test('should return 404 for non-existent task', async () => {
      const { status, data } = await post<ErrorResponse>('/api/tasks/nonexistent-id/cancel');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should log task_cancelled event', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Cancel Log Task',
        }
      );

      await post<SuccessResponse>(`/api/tasks/${createData.data.id}/cancel`);

      const { data: logData } = await get<TaskLogListResponse>(
        `/api/tasks/${createData.data.id}/logs`
      );

      expect(logData.data.some((log) => log.eventType === 'task_cancelled')).toBe(true);
    });

    test('should add system comment when cancelling', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Cancel Comment Task',
        }
      );

      await post<SuccessResponse>(`/api/tasks/${createData.data.id}/cancel`);

      const { data: commentData } = await get<TaskCommentListResponse>(
        `/api/tasks/${createData.data.id}/comments`
      );

      expect(commentData.data.length).toBeGreaterThanOrEqual(1);
      expect(commentData.data.some((c) => c.content === 'Task cancelled by user')).toBe(true);
    });
  });

  describe('DELETE /api/workspaces/:id/tasks/done', () => {
    test('should delete done tasks', async () => {
      // Create a fresh workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Delete Done Tasks Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create tasks and mark some as done
      const { data: task1 } = await post<TaskResponse>(`/api/workspaces/${workspaceId}/tasks`, {
        summary: 'Done Task 1',
      });
      const { data: task2 } = await post<TaskResponse>(`/api/workspaces/${workspaceId}/tasks`, {
        summary: 'Done Task 2',
      });
      await post<TaskResponse>(`/api/workspaces/${workspaceId}/tasks`, {
        summary: 'Not Done Task',
      });

      // Mark task1 and task2 as done
      await put<TaskResponse>(`/api/tasks/${task1.data.id}`, { status: 'done' });
      await put<TaskResponse>(`/api/tasks/${task2.data.id}`, { status: 'done' });

      // Delete done tasks
      const { status, data } = await del<DeletedResponse>(`/api/workspaces/${workspaceId}/tasks/done`);

      expect(status).toBe(200);
      expect(data.deleted).toBe(2);

      // Verify done tasks are deleted
      const { data: listData } = await get<TaskListResponse>(`/api/workspaces/${workspaceId}/tasks`);
      expect(listData.data.length).toBe(1);
      expect(listData.data[0]?.summary).toBe('Not Done Task');

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });

    test('should return 0 when no done tasks exist', async () => {
      // Create a fresh workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'No Done Tasks Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create a task but don't mark it as done
      await post<TaskResponse>(`/api/workspaces/${workspaceId}/tasks`, {
        summary: 'In Progress Task',
      });

      // Delete done tasks
      const { status, data } = await del<DeletedResponse>(`/api/workspaces/${workspaceId}/tasks/done`);

      expect(status).toBe(200);
      expect(data.deleted).toBe(0);

      // Clean up
      await del(`/api/workspaces/${workspaceId}`);
    });
  });

  describe('GET /api/tasks/:id/comments', () => {
    test('should list comments for a task', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with Comments',
        }
      );

      // Add comments
      await post<TaskCommentResponse>(`/api/tasks/${createData.data.id}/comments`, {
        content: 'First comment',
      });
      await post<TaskCommentResponse>(`/api/tasks/${createData.data.id}/comments`, {
        content: 'Second comment',
      });

      const { status, data } = await get<TaskCommentListResponse>(
        `/api/tasks/${createData.data.id}/comments`
      );

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.data.some((c) => c.content === 'First comment')).toBe(true);
      expect(data.data.some((c) => c.content === 'Second comment')).toBe(true);
    });

    test('should return empty array for task with no comments', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task without Comments',
        }
      );

      const { status, data } = await get<TaskCommentListResponse>(
        `/api/tasks/${createData.data.id}/comments`
      );

      expect(status).toBe(200);
      expect(data.data.length).toBe(0);
    });

    test('should return 404 for non-existent task', async () => {
      const { status, data } = await get<ErrorResponse>('/api/tasks/nonexistent-id/comments');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/tasks/:id/comments', () => {
    test('should add a comment to a task', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Comment Target Task',
        }
      );

      const { status, data } = await post<TaskCommentResponse>(
        `/api/tasks/${createData.data.id}/comments`,
        {
          content: 'This is a test comment',
        }
      );

      expect(status).toBe(201);
      expect(data.data.content).toBe('This is a test comment');
      expect(data.data.taskId).toBe(createData.data.id);
      expect(data.data.workspaceId).toBe(testWorkspaceId);
      expect(data.data.id).toBeDefined();
    });

    test('should fail without content', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'No Content Comment Task',
        }
      );

      const { status } = await post<unknown>(`/api/tasks/${createData.data.id}/comments`, {});

      expect(status).toBe(400);
    });

    test('should fail with empty content', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Empty Content Comment Task',
        }
      );

      const { status } = await post<unknown>(`/api/tasks/${createData.data.id}/comments`, {
        content: '',
      });

      expect(status).toBe(400);
    });

    test('should return 404 for non-existent task', async () => {
      const { status, data } = await post<ErrorResponse>('/api/tasks/nonexistent-id/comments', {
        content: 'Test comment',
      });

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    test('should log comment_added event', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Comment Log Task',
        }
      );

      await post<TaskCommentResponse>(`/api/tasks/${createData.data.id}/comments`, {
        content: 'Test comment for logging',
      });

      const { data: logData } = await get<TaskLogListResponse>(
        `/api/tasks/${createData.data.id}/logs`
      );

      expect(logData.data.some((log) => log.eventType === 'comment_added')).toBe(true);
    });
  });

  describe('GET /api/tasks/:id/logs', () => {
    test('should list activity logs for a task', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with Logs',
        }
      );

      const { status, data } = await get<TaskLogListResponse>(
        `/api/tasks/${createData.data.id}/logs`
      );

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      // Should have at least task_created log
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      expect(data.data.some((log) => log.eventType === 'task_created')).toBe(true);
    });

    test('should include multiple event types in logs', async () => {
      const { data: createData } = await post<TaskResponse>(
        `/api/workspaces/${testWorkspaceId}/tasks`,
        {
          summary: 'Task with Multiple Logs',
        }
      );

      // Change status
      await put<TaskResponse>(`/api/tasks/${createData.data.id}`, {
        status: 'in_progress',
      });

      // Add comment
      await post<TaskCommentResponse>(`/api/tasks/${createData.data.id}/comments`, {
        content: 'Test comment',
      });

      // Prioritize
      await post<SuccessResponse>(`/api/tasks/${createData.data.id}/prioritize`);

      const { status, data } = await get<TaskLogListResponse>(
        `/api/tasks/${createData.data.id}/logs`
      );

      expect(status).toBe(200);
      expect(data.data.some((log) => log.eventType === 'task_created')).toBe(true);
      expect(data.data.some((log) => log.eventType === 'status_changed')).toBe(true);
      expect(data.data.some((log) => log.eventType === 'comment_added')).toBe(true);
      expect(data.data.some((log) => log.eventType === 'task_prioritized')).toBe(true);
    });

    test('should return 404 for non-existent task', async () => {
      const { status, data } = await get<ErrorResponse>('/api/tasks/nonexistent-id/logs');

      expect(status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Cascade Delete', () => {
    test('should delete tasks when workspace is deleted', async () => {
      // Create a workspace
      const { data: wsData } = await post<WorkspaceResponse>('/api/workspaces', {
        title: 'Cascade Delete Task Workspace',
      });
      const workspaceId = wsData.data.id;

      // Create a task
      const { data: taskData } = await post<TaskResponse>(`/api/workspaces/${workspaceId}/tasks`, {
        summary: 'Cascade Task',
      });
      const taskId = taskData.data.id;

      // Verify task exists
      resetDbConnection();
      const dbBefore = getDb();
      const taskBefore = dbBefore
        .query<{ id: string }, [string]>('SELECT id FROM tasks WHERE id = ?')
        .get(taskId);
      expect(taskBefore).not.toBeNull();

      // Delete workspace
      await del(`/api/workspaces/${workspaceId}`);

      // Verify task is deleted
      resetDbConnection();
      const dbAfter = getDb();
      const taskAfter = dbAfter
        .query<{ id: string }, [string]>('SELECT id FROM tasks WHERE id = ?')
        .get(taskId);
      expect(taskAfter).toBeNull();
    });
  });
});
