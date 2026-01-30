import { z } from "zod";

/**
 * Base schema for workspace fields (shared between create and update).
 */
const workspaceBaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional().default(""),
  workingDirectory: z.string().max(4096).nullable().optional(),
});

/**
 * Schema for creating a new workspace.
 */
export const createWorkspaceSchema = workspaceBaseSchema;

/**
 * Schema for list workspaces query parameters.
 */
export const listWorkspacesQuerySchema = z.object({
  q: z.string().optional(),
});

/**
 * Schema for updating an existing workspace.
 * Includes optional retentionDays for task cleanup settings.
 */
export const updateWorkspaceSchema = workspaceBaseSchema.extend({
  retentionDays: z.number().int().min(0).max(365).optional(),
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceSchema>;
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;
