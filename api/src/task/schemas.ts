import { z } from "zod";

// =============================================================================
// Query Schemas
// =============================================================================

/**
 * Schema for listing tasks query parameters.
 * Supports pagination.
 */
export const listTasksQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Schema for listing comments query parameters.
 * Supports pagination.
 */
export const listCommentsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for listing logs query parameters.
 * Supports pagination.
 */
export const listLogsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// =============================================================================
// Body Schemas
// =============================================================================

/**
 * Schema for creating a task request body.
 */
export const createTaskBodySchema = z.object({
  summary: z.string().min(1).max(255),
  description: z.string().max(100000).optional(),
});

/**
 * Schema for updating a task request body.
 */
export const updateTaskBodySchema = z.object({
  summary: z.string().min(1).max(255).optional(),
  description: z.string().max(100000).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
});

/**
 * Schema for prioritizing a task request body.
 */
export const prioritizeTaskBodySchema = z.object({
  isPriority: z.boolean(),
});

/**
 * Schema for creating a comment request body.
 */
export const createCommentBodySchema = z.object({
  content: z.string().min(1).max(100000),
});

// =============================================================================
// CLI Output Schemas
// =============================================================================

/**
 * Schema for task action in CLI output.
 * Agents can return these actions:
 * - skip: Agent has nothing to do
 * - comment: Agent did meaningful work, content contains markdown summary
 * - change_status: Agent requests to move task to "in_review"
 */
const taskActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("skip") }),
  z.object({ type: z.literal("comment"), content: z.string().min(1) }),
  z.object({
    type: z.literal("change_status"),
    status: z.literal("in_review"),
  }),
]);

/**
 * Schema for validating CLI output from task processing.
 */
export const taskCliOutputSchema = z.object({
  actions: z.array(taskActionSchema),
});

/**
 * JSON Schema string for CLI --json-schema flag.
 * This must match the taskCliOutputSchema above.
 */
export const taskCliJsonSchema = JSON.stringify({
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            properties: {
              type: { const: "skip" },
            },
            required: ["type"],
            additionalProperties: false,
          },
          {
            type: "object",
            properties: {
              type: { const: "comment" },
              content: { type: "string", minLength: 1 },
            },
            required: ["type", "content"],
            additionalProperties: false,
          },
          {
            type: "object",
            properties: {
              type: { const: "change_status" },
              status: { const: "in_review" },
            },
            required: ["type", "status"],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ["actions"],
  additionalProperties: false,
});

// =============================================================================
// Type Exports
// =============================================================================

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type PrioritizeTaskBody = z.infer<typeof prioritizeTaskBodySchema>;
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
export type TaskCliOutput = z.infer<typeof taskCliOutputSchema>;
export type TaskAction = z.infer<typeof taskActionSchema>;
