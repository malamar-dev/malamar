import { Hono } from "hono";

import { createErrorResponse, httpStatusFromCode } from "../shared";
import * as repository from "./repository";
import {
  createCommentBodySchema,
  createTaskBodySchema,
  listCommentsQuerySchema,
  listLogsQuerySchema,
  listTasksQuerySchema,
  prioritizeTaskBodySchema,
  updateTaskBodySchema,
} from "./schemas";
import * as service from "./service";
import type { PaginatedResult, Task, TaskComment, TaskLog } from "./types";

export const taskRouter = new Hono();

// =============================================================================
// Serialization Functions
// =============================================================================

/**
 * Serialize a task for API response.
 */
function serializeTask(task: Task, includeCommentCount = false) {
  const serialized: Record<string, unknown> = {
    id: task.id,
    workspaceId: task.workspaceId,
    summary: task.summary,
    description: task.description,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };

  if (includeCommentCount) {
    serialized.commentCount = repository.countCommentsByTaskId(task.id);
  }

  return serialized;
}

/**
 * Serialize a comment for API response.
 */
function serializeComment(comment: TaskComment) {
  let authorName: string;
  let authorType: "user" | "agent" | "system";

  if (comment.agentId) {
    // Agent comment - show agent name or "(Deleted Agent)" if agent was deleted
    authorName = service.getAgentName(comment.agentId) ?? "(Deleted Agent)";
    authorType = "agent";
  } else if (comment.userId) {
    // User comment
    authorName = "User";
    authorType = "user";
  } else {
    // System comment (no user or agent)
    authorName = "System";
    authorType = "system";
  }

  return {
    id: comment.id,
    taskId: comment.taskId,
    workspaceId: comment.workspaceId,
    authorName,
    authorType,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

/**
 * Serialize a log entry for API response.
 */
function serializeLog(log: TaskLog) {
  let actorName: string;

  switch (log.actorType) {
    case "agent":
      actorName = log.actorId
        ? (service.getAgentName(log.actorId) ?? "Agent")
        : "Agent";
      break;
    case "system":
      actorName = "System";
      break;
    case "user":
    default:
      actorName = "User";
      break;
  }

  return {
    id: log.id,
    taskId: log.taskId,
    workspaceId: log.workspaceId,
    eventType: log.eventType,
    actorType: log.actorType,
    actorName,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  };
}

/**
 * Serialize pagination metadata for API response.
 */
function serializePagination<T>(result: PaginatedResult<T>) {
  return {
    total: result.total,
    offset: result.offset,
    limit: result.limit,
    hasMore: result.hasMore,
  };
}

// =============================================================================
// Task Routes
// =============================================================================

/**
 * GET /workspaces/:workspaceId/tasks - List tasks in workspace
 * Supports ?offset=&limit= for pagination.
 */
taskRouter.get("/workspaces/:workspaceId/tasks", (c) => {
  const workspaceId = c.req.param("workspaceId");

  // Parse and validate query parameters
  const query = c.req.query();
  const parsed = listTasksQuerySchema.safeParse(query);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid query parameters",
      ),
      400,
    );
  }

  const result = service.listTasks(
    workspaceId,
    parsed.data.offset,
    parsed.data.limit,
  );

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({
    tasks: result.data.items.map((task) => serializeTask(task, true)),
    pagination: serializePagination(result.data),
  });
});

/**
 * POST /workspaces/:workspaceId/tasks - Create a new task
 * Body: { summary: string, description?: string }
 */
taskRouter.post("/workspaces/:workspaceId/tasks", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = createTaskBodySchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid request body",
      ),
      400,
    );
  }

  const result = service.createTask(workspaceId, parsed.data);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeTask(result.data), 201);
});

/**
 * DELETE /workspaces/:workspaceId/tasks/done - Delete all done tasks
 */
taskRouter.delete("/workspaces/:workspaceId/tasks/done", (c) => {
  const workspaceId = c.req.param("workspaceId");

  const result = service.deleteAllDoneTasks(workspaceId);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({ deletedCount: result.data.deletedCount });
});

/**
 * GET /tasks/:id - Get task details
 */
taskRouter.get("/tasks/:id", (c) => {
  const id = c.req.param("id");

  const result = service.getTask(id);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeTask(result.data));
});

/**
 * PUT /tasks/:id - Update a task
 * Body: { summary?: string, description?: string, status?: TaskStatus }
 */
taskRouter.put("/tasks/:id", async (c) => {
  const id = c.req.param("id");

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateTaskBodySchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid request body",
      ),
      400,
    );
  }

  const result = service.updateTask(id, parsed.data);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeTask(result.data));
});

/**
 * DELETE /tasks/:id - Delete a task
 */
taskRouter.delete("/tasks/:id", (c) => {
  const id = c.req.param("id");

  const result = service.deleteTask(id);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({ success: true });
});

/**
 * POST /tasks/:id/prioritize - Prioritize or deprioritize a task
 * Body: { isPriority: boolean }
 */
taskRouter.post("/tasks/:id/prioritize", async (c) => {
  const id = c.req.param("id");

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = prioritizeTaskBodySchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid request body",
      ),
      400,
    );
  }

  const result = service.prioritizeTask(id, parsed.data.isPriority);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({ success: true });
});

/**
 * POST /tasks/:id/cancel - Cancel a running task
 */
taskRouter.post("/tasks/:id/cancel", (c) => {
  const id = c.req.param("id");

  const result = service.cancelTask(id);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({ success: true });
});

// =============================================================================
// Comment Routes
// =============================================================================

/**
 * GET /tasks/:id/comments - List comments for a task
 * Supports ?offset=&limit= for pagination.
 */
taskRouter.get("/tasks/:id/comments", (c) => {
  const taskId = c.req.param("id");

  // Parse and validate query parameters
  const query = c.req.query();
  const parsed = listCommentsQuerySchema.safeParse(query);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid query parameters",
      ),
      400,
    );
  }

  const result = service.listComments(
    taskId,
    parsed.data.offset,
    parsed.data.limit,
  );

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({
    comments: result.data.items.map(serializeComment),
    pagination: serializePagination(result.data),
  });
});

/**
 * POST /tasks/:id/comments - Add a comment to a task
 * Body: { content: string }
 */
taskRouter.post("/tasks/:id/comments", async (c) => {
  const taskId = c.req.param("id");

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = createCommentBodySchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid request body",
      ),
      400,
    );
  }

  const result = service.createComment(taskId, parsed.data);

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json(serializeComment(result.data), 201);
});

// =============================================================================
// Log Routes
// =============================================================================

/**
 * GET /tasks/:id/logs - List activity logs for a task
 * Supports ?offset=&limit= for pagination.
 */
taskRouter.get("/tasks/:id/logs", (c) => {
  const taskId = c.req.param("id");

  // Parse and validate query parameters
  const query = c.req.query();
  const parsed = listLogsQuerySchema.safeParse(query);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        firstError?.message ?? "Invalid query parameters",
      ),
      400,
    );
  }

  const result = service.listLogs(
    taskId,
    parsed.data.offset,
    parsed.data.limit,
  );

  if (!result.ok) {
    return c.json(
      createErrorResponse(result.code, result.error),
      httpStatusFromCode(result.code),
    );
  }

  return c.json({
    logs: result.data.items.map(serializeLog),
    pagination: serializePagination(result.data),
  });
});
