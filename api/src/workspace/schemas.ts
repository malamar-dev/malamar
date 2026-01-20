import { z } from "zod";

/**
 * Schema for creating a new workspace.
 */
export const createWorkspaceSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional().default(""),
});

/**
 * Schema for list workspaces query parameters.
 */
export const listWorkspacesQuerySchema = z.object({
  q: z.string().optional(),
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>;
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;
