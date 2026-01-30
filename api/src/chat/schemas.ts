import { z } from "zod";

/**
 * Schema for listing chats query parameters.
 * Supports search and pagination.
 */
export const listChatsQuerySchema = z.object({
  q: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Schema for listing messages query parameters.
 * Supports pagination only.
 */
export const listMessagesQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for creating a chat request body.
 * All fields are optional.
 */
export const createChatBodySchema = z.object({
  title: z.string().max(255).optional(),
  agentId: z.string().optional().nullable(),
});

/**
 * Schema for creating a message request body.
 */
export const createMessageBodySchema = z.object({
  message: z.string().min(1).max(100000),
});

/**
 * Schema for updating a chat request body.
 * Supports updating title and/or switching agent.
 */
export const updateChatBodySchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    agentId: z.string().nullable().optional(),
  })
  .refine((data) => data.title !== undefined || data.agentId !== undefined, {
    message: "At least one of title or agentId must be provided",
  });

/**
 * Schema for validating CLI output from chat processing.
 * Both message and actions are optional.
 */
export const cliOutputSchema = z.object({
  message: z.string().optional(),
  actions: z
    .array(
      z
        .object({
          type: z.string(),
        })
        .passthrough(),
    )
    .optional(),
});

export type ListChatsQuery = z.infer<typeof listChatsQuerySchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type CreateChatBody = z.infer<typeof createChatBodySchema>;
export type CreateMessageBody = z.infer<typeof createMessageBodySchema>;
export type UpdateChatBody = z.infer<typeof updateChatBodySchema>;
export type CliOutput = z.infer<typeof cliOutputSchema>;
