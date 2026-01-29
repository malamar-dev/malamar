import { z } from "zod";

// =============================================================================
// Query Schemas
// =============================================================================

/**
 * Schema for listing tasks query parameters.
 * Supports pagination.
 */
export const listTasksQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Schema for listing comments query parameters.
 * Supports pagination.
 */
export const listCommentsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for listing logs query parameters.
 * Supports pagination.
 */
export const listLogsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// =============================================================================
// Body Schemas
// =============================================================================

/**
 * Schema for creating a task request body.
 */
export const createTaskBodySchema = z.object({
  summary: z.string().min(1).max(255),
  description: z.string().max(100000).optional(),
});

/**
 * Schema for updating a task request body.
 */
export const updateTaskBodySchema = z.object({
  summary: z.string().min(1).max(255).optional(),
  description: z.string().max(100000).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
});

/**
 * Schema for prioritizing a task request body.
 */
export const prioritizeTaskBodySchema = z.object({
  isPriority: z.boolean(),
});

/**
 * Schema for creating a comment request body.
 */
export const createCommentBodySchema = z.object({
  content: z.string().min(1).max(100000),
});

// =============================================================================
// Type Exports
// =============================================================================

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type PrioritizeTaskBody = z.infer<typeof prioritizeTaskBodySchema>;
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
