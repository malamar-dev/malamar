import { z } from "zod";

/**
 * Valid CLI types for agents.
 */
export const cliTypeSchema = z.enum(["claude", "gemini", "codex", "opencode"]);

/**
 * Schema for creating a new agent.
 */
export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  instruction: z.string().min(1, "Instruction is required").max(65535),
  cliType: cliTypeSchema,
});

/**
 * Schema for updating an existing agent.
 */
export const updateAgentSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255).optional(),
  instruction: z
    .string()
    .min(1, "Instruction cannot be empty")
    .max(65535)
    .optional(),
  cliType: cliTypeSchema.optional(),
});

/**
 * Schema for reordering agents.
 */
export const reorderAgentsSchema = z.object({
  agentIds: z.array(z.string().min(1)).min(1, "Agent IDs are required"),
});

export type CreateAgentBody = z.infer<typeof createAgentSchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentSchema>;
export type ReorderAgentsBody = z.infer<typeof reorderAgentsSchema>;
