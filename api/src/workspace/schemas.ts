import { z } from "zod";

/**
 * Base schema for workspace fields (shared between create and update).
 */
const workspaceBaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional().default(""),
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
 */
export const updateWorkspaceSchema = workspaceBaseSchema;

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceSchema>;
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;
