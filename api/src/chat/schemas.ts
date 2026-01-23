import { z } from "zod";

/**
 * Schema for listing chats query parameters.
 * Supports search and pagination.
 */
export const listChatsQuerySchema = z.object({
  q: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for listing messages query parameters.
 * Supports pagination only.
 */
export const listMessagesQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListChatsQuery = z.infer<typeof listChatsQuerySchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
