import { z } from 'zod';

/**
 * Working directory mode enum
 */
export const workingDirectoryModeSchema = z.enum(['static', 'temp']);

/**
 * Schema for creating a workspace
 */
export const createWorkspaceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  workingDirectoryMode: workingDirectoryModeSchema.optional(),
  workingDirectoryPath: z.string().nullable().optional(),
  autoDeleteDoneTasks: z.boolean().optional(),
  retentionDays: z.number().int().min(0).optional(),
  notifyOnError: z.boolean().optional(),
  notifyOnInReview: z.boolean().optional(),
});

/**
 * Schema for updating a workspace
 */
export const updateWorkspaceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  workingDirectoryMode: workingDirectoryModeSchema.optional(),
  workingDirectoryPath: z.string().nullable().optional(),
  autoDeleteDoneTasks: z.boolean().optional(),
  retentionDays: z.number().int().min(0).optional(),
  notifyOnError: z.boolean().optional(),
  notifyOnInReview: z.boolean().optional(),
});

/**
 * Schema for workspace response
 */
export const workspaceResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  workingDirectoryMode: workingDirectoryModeSchema,
  workingDirectoryPath: z.string().nullable(),
  autoDeleteDoneTasks: z.boolean(),
  retentionDays: z.number(),
  notifyOnError: z.boolean(),
  notifyOnInReview: z.boolean(),
  lastActivityAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Schema for workspace list response
 */
export const workspaceListResponseSchema = z.object({
  data: z.array(workspaceResponseSchema),
});

/**
 * Type exports
 */
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;
export type WorkspaceListResponse = z.infer<typeof workspaceListResponseSchema>;
