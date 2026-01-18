import { z } from 'zod';

/**
 * Task status enum
 */
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'in_review', 'done']);

/**
 * Schema for creating a task
 */
export const createTaskSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  description: z.string().optional(),
});

/**
 * Schema for updating a task
 */
export const updateTaskSchema = z.object({
  summary: z.string().min(1).optional(),
  description: z.string().optional(),
  status: taskStatusSchema.optional(),
});

/**
 * Schema for adding a comment
 */
export const addCommentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

/**
 * Schema for task response
 */
export const taskResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  summary: z.string(),
  description: z.string(),
  status: taskStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
