import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { addCommentSchema, createTaskSchema, updateTaskSchema } from './schemas.ts';
import * as service from './service.ts';

// Routes for tasks within workspaces
export const workspaceTaskRoutes = new Hono();

// GET /workspaces/:id/tasks - List tasks in workspace
workspaceTaskRoutes.get('/:id/tasks', (c) => {
  const workspaceId = c.req.param('id');
  const tasks = service.listTasks(workspaceId);
  return c.json({ data: tasks });
});

// POST /workspaces/:id/tasks - Create task
workspaceTaskRoutes.post('/:id/tasks', zValidator('json', createTaskSchema), (c) => {
  const workspaceId = c.req.param('id');
  const input = c.req.valid('json');
  const task = service.createTask({ ...input, workspaceId });
  return c.json({ data: task }, 201);
});

// DELETE /workspaces/:id/tasks/done - Delete done tasks
workspaceTaskRoutes.delete('/:id/tasks/done', (c) => {
  const workspaceId = c.req.param('id');
  const deleted = service.deleteDoneTasks(workspaceId);
  return c.json({ deleted });
});

// Routes for direct task operations
export const taskRoutes = new Hono();

// GET /tasks/:id - Get task
taskRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const task = service.getTask(id);
  return c.json({ data: task });
});

// PUT /tasks/:id - Update task
taskRoutes.put('/:id', zValidator('json', updateTaskSchema), (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const task = service.updateTask(id, input);
  return c.json({ data: task });
});

// DELETE /tasks/:id - Delete task
taskRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  service.deleteTask(id);
  return c.json({ success: true });
});

// POST /tasks/:id/prioritize - Prioritize task
taskRoutes.post('/:id/prioritize', (c) => {
  const id = c.req.param('id');
  service.prioritizeTask(id);
  return c.json({ success: true });
});

// POST /tasks/:id/cancel - Cancel task
taskRoutes.post('/:id/cancel', (c) => {
  const id = c.req.param('id');
  service.cancelTask(id);
  return c.json({ success: true });
});

// GET /tasks/:id/comments - List comments
taskRoutes.get('/:id/comments', (c) => {
  const id = c.req.param('id');
  const comments = service.getComments(id);
  return c.json({ data: comments });
});

// POST /tasks/:id/comments - Add comment
taskRoutes.post('/:id/comments', zValidator('json', addCommentSchema), (c) => {
  const id = c.req.param('id');
  const { content } = c.req.valid('json');
  const comment = service.addComment(id, content);
  return c.json({ data: comment }, 201);
});

// GET /tasks/:id/logs - List activity logs
taskRoutes.get('/:id/logs', (c) => {
  const id = c.req.param('id');
  const logs = service.getLogs(id);
  return c.json({ data: logs });
});
