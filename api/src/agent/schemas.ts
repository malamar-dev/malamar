import { z } from 'zod';

/**
 * CLI type enum
 */
export const cliTypeSchema = z.enum(['claude', 'gemini', 'codex', 'opencode']);

/**
 * Schema for creating an agent
 */
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  instruction: z.string().min(1, 'Instruction is required'),
  cliType: cliTypeSchema,
  order: z.number().int().positive().optional(),
});

/**
 * Schema for updating an agent
 */
export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  instruction: z.string().min(1).optional(),
  cliType: cliTypeSchema.optional(),
});

/**
 * Schema for reordering agents
 */
export const reorderAgentsSchema = z.object({
  agentIds: z.array(z.string()).min(1, 'At least one agent ID is required'),
});

/**
 * Schema for agent response
 */
export const agentResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  instruction: z.string(),
  cliType: cliTypeSchema,
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Schema for agent list response
 */
export const agentListResponseSchema = z.object({
  data: z.array(agentResponseSchema),
});
