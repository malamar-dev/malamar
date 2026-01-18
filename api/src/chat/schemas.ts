import { z } from 'zod';

/**
 * CLI type enum
 */
export const cliTypeSchema = z.enum(['claude', 'gemini', 'codex', 'opencode']);

/**
 * Message role enum
 */
export const messageRoleSchema = z.enum(['user', 'agent', 'system']);

/**
 * Schema for creating a chat
 */
export const createChatSchema = z.object({
  agentId: z.string().optional(),
  cliType: cliTypeSchema.optional(),
  title: z.string().optional(),
});

/**
 * Schema for updating a chat
 */
export const updateChatSchema = z.object({
  agentId: z.string().nullable().optional(),
  cliType: cliTypeSchema.nullable().optional(),
  title: z.string().optional(),
});

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});

/**
 * Schema for chat response
 */
export const chatResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  agentId: z.string().nullable(),
  cliType: cliTypeSchema.nullable(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Schema for chat message response
 */
export const chatMessageResponseSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: messageRoleSchema,
  message: z.string(),
  actions: z.array(z.unknown()).nullable(),
  createdAt: z.string(),
});
