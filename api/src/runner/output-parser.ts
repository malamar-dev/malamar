import { CLI_TYPES, isCliType, isTaskStatus, TASK_STATUSES } from '../core/types.ts';
import {
  CHAT_ACTION_TYPES,
  type ChatAction,
  type ChatOutput,
  type CreateAgentAction,
  type DeleteAgentAction,
  isChatActionType,
  isTaskActionType,
  type RenameChatAction,
  type ReorderAgentsAction,
  TASK_ACTION_TYPES,
  type TaskAction,
  type TaskOutput,
  type UpdateAgentAction,
  type UpdateWorkspaceAction,
} from './types.ts';

/**
 * Result of parsing an output file
 */
export interface ParseResult<T> {
  success: true;
  data: T;
}

export interface ParseError {
  success: false;
  error: string;
  errorType: 'file_missing' | 'file_empty' | 'json_parse' | 'schema_validation';
}

export type ParseTaskResult = ParseResult<TaskOutput> | ParseError;
export type ParseChatResult = ParseResult<ChatOutput> | ParseError;

/**
 * Parse task output from a JSON file
 *
 * Error checking order (per TECHNICAL_DESIGN.md):
 * 1. Output file missing
 * 2. Output file empty
 * 3. JSON parse failure
 * 4. Schema validation failure
 * 5. Success
 */
export async function parseTaskOutputFile(filePath: string): Promise<ParseTaskResult> {
  // Check if file exists
  const file = Bun.file(filePath);
  const exists = await file.exists();

  if (!exists) {
    return {
      success: false,
      error: `CLI completed but output file was not created at ${filePath}`,
      errorType: 'file_missing',
    };
  }

  // Read file content
  const content = await file.text();

  // Check if file is empty
  if (!content || content.trim() === '') {
    return {
      success: false,
      error: 'CLI completed but output file was empty',
      errorType: 'file_empty',
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `CLI output was not valid JSON: ${message}`,
      errorType: 'json_parse',
    };
  }

  // Validate schema
  const validationResult = validateTaskOutput(parsed);
  if (!validationResult.valid) {
    return {
      success: false,
      error: `CLI output structure was invalid: ${validationResult.error}`,
      errorType: 'schema_validation',
    };
  }

  return {
    success: true,
    data: validationResult.data,
  };
}

/**
 * Parse task output from a string (useful for testing)
 */
export function parseTaskOutput(content: string): ParseTaskResult {
  // Check if content is empty
  if (!content || content.trim() === '') {
    return {
      success: false,
      error: 'CLI completed but output file was empty',
      errorType: 'file_empty',
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `CLI output was not valid JSON: ${message}`,
      errorType: 'json_parse',
    };
  }

  // Validate schema
  const validationResult = validateTaskOutput(parsed);
  if (!validationResult.valid) {
    return {
      success: false,
      error: `CLI output structure was invalid: ${validationResult.error}`,
      errorType: 'schema_validation',
    };
  }

  return {
    success: true,
    data: validationResult.data,
  };
}

/**
 * Parse chat output from a JSON file
 *
 * Error checking order (per TECHNICAL_DESIGN.md):
 * 1. Output file missing
 * 2. Output file empty
 * 3. JSON parse failure
 * 4. Schema validation failure
 * 5. Success
 */
export async function parseChatOutputFile(filePath: string): Promise<ParseChatResult> {
  // Check if file exists
  const file = Bun.file(filePath);
  const exists = await file.exists();

  if (!exists) {
    return {
      success: false,
      error: `CLI completed but output file was not created at ${filePath}`,
      errorType: 'file_missing',
    };
  }

  // Read file content
  const content = await file.text();

  // Check if file is empty
  if (!content || content.trim() === '') {
    return {
      success: false,
      error: 'CLI completed but output file was empty',
      errorType: 'file_empty',
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `CLI output was not valid JSON: ${message}`,
      errorType: 'json_parse',
    };
  }

  // Validate schema
  const validationResult = validateChatOutput(parsed);
  if (!validationResult.valid) {
    return {
      success: false,
      error: `CLI output structure was invalid: ${validationResult.error}`,
      errorType: 'schema_validation',
    };
  }

  return {
    success: true,
    data: validationResult.data,
  };
}

/**
 * Parse chat output from a string (useful for testing)
 */
export function parseChatOutput(content: string): ParseChatResult {
  // Check if content is empty
  if (!content || content.trim() === '') {
    return {
      success: false,
      error: 'CLI completed but output file was empty',
      errorType: 'file_empty',
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `CLI output was not valid JSON: ${message}`,
      errorType: 'json_parse',
    };
  }

  // Validate schema
  const validationResult = validateChatOutput(parsed);
  if (!validationResult.valid) {
    return {
      success: false,
      error: `CLI output structure was invalid: ${validationResult.error}`,
      errorType: 'schema_validation',
    };
  }

  return {
    success: true,
    data: validationResult.data,
  };
}

/**
 * Validation result type
 */
interface ValidationSuccess<T> {
  valid: true;
  data: T;
}

interface ValidationFailure {
  valid: false;
  error: string;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validate task output structure
 */
export function validateTaskOutput(value: unknown): ValidationResult<TaskOutput> {
  // Must be an object (but not an array)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: 'Expected an object' };
  }

  const obj = value as Record<string, unknown>;

  // Must have actions array
  if (!('actions' in obj)) {
    return { valid: false, error: 'Missing required field: actions' };
  }

  if (!Array.isArray(obj.actions)) {
    return { valid: false, error: 'Field "actions" must be an array' };
  }

  // Validate each action
  const validatedActions: TaskAction[] = [];
  for (let i = 0; i < obj.actions.length; i++) {
    const actionResult = validateTaskAction(obj.actions[i], i);
    if (!actionResult.valid) {
      return actionResult;
    }
    validatedActions.push(actionResult.data);
  }

  return {
    valid: true,
    data: { actions: validatedActions },
  };
}

/**
 * Validate a single task action
 */
export function validateTaskAction(value: unknown, index: number): ValidationResult<TaskAction> {
  const prefix = `actions[${index}]`;

  // Must be an object (but not an array)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: `${prefix}: Expected an object` };
  }

  const obj = value as Record<string, unknown>;

  // Must have type
  if (!('type' in obj)) {
    return { valid: false, error: `${prefix}: Missing required field: type` };
  }

  if (typeof obj.type !== 'string') {
    return { valid: false, error: `${prefix}: Field "type" must be a string` };
  }

  if (!isTaskActionType(obj.type)) {
    return {
      valid: false,
      error: `${prefix}: Invalid action type "${obj.type}". Must be one of: ${TASK_ACTION_TYPES.join(', ')}`,
    };
  }

  // Validate based on action type
  switch (obj.type) {
    case 'skip':
      return { valid: true, data: { type: 'skip' } };

    case 'comment':
      if (!('content' in obj)) {
        return { valid: false, error: `${prefix}: Missing required field: content` };
      }
      if (typeof obj.content !== 'string') {
        return { valid: false, error: `${prefix}: Field "content" must be a string` };
      }
      if (obj.content.trim() === '') {
        return { valid: false, error: `${prefix}: Field "content" must not be empty` };
      }
      return { valid: true, data: { type: 'comment', content: obj.content } };

    case 'change_status':
      if (!('status' in obj)) {
        return { valid: false, error: `${prefix}: Missing required field: status` };
      }
      if (typeof obj.status !== 'string') {
        return { valid: false, error: `${prefix}: Field "status" must be a string` };
      }
      if (!isTaskStatus(obj.status)) {
        return {
          valid: false,
          error: `${prefix}: Invalid status "${obj.status}". Must be one of: ${TASK_STATUSES.join(', ')}`,
        };
      }
      return { valid: true, data: { type: 'change_status', status: obj.status } };

    default:
      // This should never happen due to the isTaskActionType check above
      return { valid: false, error: `${prefix}: Unknown action type` };
  }
}

/**
 * Validate chat output structure
 */
export function validateChatOutput(value: unknown): ValidationResult<ChatOutput> {
  // Must be an object (but not an array)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: 'Expected an object' };
  }

  const obj = value as Record<string, unknown>;

  const result: ChatOutput = {};

  // Validate message (optional)
  if ('message' in obj) {
    if (typeof obj.message !== 'string') {
      return { valid: false, error: 'Field "message" must be a string' };
    }
    result.message = obj.message;
  }

  // Validate actions (optional)
  if ('actions' in obj) {
    if (!Array.isArray(obj.actions)) {
      return { valid: false, error: 'Field "actions" must be an array' };
    }

    const validatedActions: ChatAction[] = [];
    for (let i = 0; i < obj.actions.length; i++) {
      const actionResult = validateChatAction(obj.actions[i], i);
      if (!actionResult.valid) {
        return actionResult;
      }
      validatedActions.push(actionResult.data);
    }
    result.actions = validatedActions;
  }

  return {
    valid: true,
    data: result,
  };
}

/**
 * Validate a single chat action
 */
export function validateChatAction(value: unknown, index: number): ValidationResult<ChatAction> {
  const prefix = `actions[${index}]`;

  // Must be an object (but not an array)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: `${prefix}: Expected an object` };
  }

  const obj = value as Record<string, unknown>;

  // Must have type
  if (!('type' in obj)) {
    return { valid: false, error: `${prefix}: Missing required field: type` };
  }

  if (typeof obj.type !== 'string') {
    return { valid: false, error: `${prefix}: Field "type" must be a string` };
  }

  if (!isChatActionType(obj.type)) {
    return {
      valid: false,
      error: `${prefix}: Invalid action type "${obj.type}". Must be one of: ${CHAT_ACTION_TYPES.join(', ')}`,
    };
  }

  // Validate based on action type
  switch (obj.type) {
    case 'create_agent':
      return validateCreateAgentAction(obj, prefix);

    case 'update_agent':
      return validateUpdateAgentAction(obj, prefix);

    case 'delete_agent':
      return validateDeleteAgentAction(obj, prefix);

    case 'reorder_agents':
      return validateReorderAgentsAction(obj, prefix);

    case 'update_workspace':
      return validateUpdateWorkspaceAction(obj, prefix);

    case 'rename_chat':
      return validateRenameChatAction(obj, prefix);

    default:
      // This should never happen due to the isChatActionType check above
      return { valid: false, error: `${prefix}: Unknown action type` };
  }
}

/**
 * Validate create_agent action
 */
function validateCreateAgentAction(
  obj: Record<string, unknown>,
  prefix: string
): ValidationResult<CreateAgentAction> {
  // Required: name
  if (!('name' in obj)) {
    return { valid: false, error: `${prefix}: Missing required field: name` };
  }
  if (typeof obj.name !== 'string') {
    return { valid: false, error: `${prefix}: Field "name" must be a string` };
  }
  if (obj.name.trim() === '') {
    return { valid: false, error: `${prefix}: Field "name" must not be empty` };
  }

  // Required: instruction
  if (!('instruction' in obj)) {
    return { valid: false, error: `${prefix}: Missing required field: instruction` };
  }
  if (typeof obj.instruction !== 'string') {
    return { valid: false, error: `${prefix}: Field "instruction" must be a string` };
  }
  if (obj.instruction.trim() === '') {
    return { valid: false, error: `${prefix}: Field "instruction" must not be empty` };
  }

  const action: CreateAgentAction = {
    type: 'create_agent',
    name: obj.name,
    instruction: obj.instruction,
  };

  // Optional: cliType
  if ('cliType' in obj && obj.cliType !== undefined && obj.cliType !== null) {
    if (typeof obj.cliType !== 'string') {
      return { valid: false, error: `${prefix}: Field "cliType" must be a string` };
    }
    if (!isCliType(obj.cliType)) {
      return {
        valid: false,
        error: `${prefix}: Invalid cliType "${obj.cliType}". Must be one of: ${CLI_TYPES.join(', ')}`,
      };
    }
    action.cliType = obj.cliType;
  }

  // Optional: order
  if ('order' in obj && obj.order !== undefined && obj.order !== null) {
    if (typeof obj.order !== 'number' || !Number.isInteger(obj.order) || obj.order < 0) {
      return { valid: false, error: `${prefix}: Field "order" must be a non-negative integer` };
    }
    action.order = obj.order;
  }

  return { valid: true, data: action };
}

/**
 * Validate update_agent action
 */
function validateUpdateAgentAction(
  obj: Record<string, unknown>,
  prefix: string
): ValidationResult<UpdateAgentAction> {
  // Required: agentId
  if (!('agentId' in obj)) {
    return { valid: false, error: `${prefix}: Missing required field: agentId` };
  }
  if (typeof obj.agentId !== 'string') {
    return { valid: false, error: `${prefix}: Field "agentId" must be a string` };
  }
  if (obj.agentId.trim() === '') {
    return { valid: false, error: `${prefix}: Field "agentId" must not be empty` };
  }

  const action: UpdateAgentAction = {
    type: 'update_agent',
    agentId: obj.agentId,
  };

  // Optional: name
  if ('name' in obj && obj.name !== undefined) {
    if (typeof obj.name !== 'string') {
      return { valid: false, error: `${prefix}: Field "name" must be a string` };
    }
    if (obj.name.trim() === '') {
      return { valid: false, error: `${prefix}: Field "name" must not be empty when provided` };
    }
    action.name = obj.name;
  }

  // Optional: instruction
  if ('instruction' in obj && obj.instruction !== undefined) {
    if (typeof obj.instruction !== 'string') {
      return { valid: false, error: `${prefix}: Field "instruction" must be a string` };
    }
    if (obj.instruction.trim() === '') {
      return { valid: false, error: `${prefix}: Field "instruction" must not be empty when provided` };
    }
    action.instruction = obj.instruction;
  }

  // Optional: cliType (can be null to clear)
  if ('cliType' in obj) {
    if (obj.cliType === null) {
      action.cliType = null;
    } else if (obj.cliType !== undefined) {
      if (typeof obj.cliType !== 'string') {
        return { valid: false, error: `${prefix}: Field "cliType" must be a string or null` };
      }
      if (!isCliType(obj.cliType)) {
        return {
          valid: false,
          error: `${prefix}: Invalid cliType "${obj.cliType}". Must be one of: ${CLI_TYPES.join(', ')}`,
        };
      }
      action.cliType = obj.cliType;
    }
  }

  // Optional: order
  if ('order' in obj && obj.order !== undefined && obj.order !== null) {
    if (typeof obj.order !== 'number' || !Number.isInteger(obj.order) || obj.order < 0) {
      return { valid: false, error: `${prefix}: Field "order" must be a non-negative integer` };
    }
    action.order = obj.order;
  }

  return { valid: true, data: action };
}

/**
 * Validate delete_agent action
 */
function validateDeleteAgentAction(
  obj: Record<string, unknown>,
  prefix: string
): ValidationResult<DeleteAgentAction> {
  // Required: agentId
  if (!('agentId' in obj)) {
    return { valid: false, error: `${prefix}: Missing required field: agentId` };
  }
  if (typeof obj.agentId !== 'string') {
    return { valid: false, error: `${prefix}: Field "agentId" must be a string` };
  }
  if (obj.agentId.trim() === '') {
    return { valid: false, error: `${prefix}: Field "agentId" must not be empty` };
  }

  return {
    valid: true,
    data: {
      type: 'delete_agent',
      agentId: obj.agentId,
    },
  };
}

/**
 * Validate reorder_agents action
 */
function validateReorderAgentsAction(
  obj: Record<string, unknown>,
  prefix: string
): ValidationResult<ReorderAgentsAction> {
  // Required: agentIds
  if (!('agentIds' in obj)) {
    return { valid: false, error: `${prefix}: Missing required field: agentIds` };
  }
  if (!Array.isArray(obj.agentIds)) {
    return { valid: false, error: `${prefix}: Field "agentIds" must be an array` };
  }

  for (let i = 0; i < obj.agentIds.length; i++) {
    if (typeof obj.agentIds[i] !== 'string') {
      return { valid: false, error: `${prefix}: Field "agentIds[${i}]" must be a string` };
    }
    if ((obj.agentIds[i] as string).trim() === '') {
      return { valid: false, error: `${prefix}: Field "agentIds[${i}]" must not be empty` };
    }
  }

  return {
    valid: true,
    data: {
      type: 'reorder_agents',
      agentIds: obj.agentIds as string[],
    },
  };
}

/**
 * Validate update_workspace action
 */
function validateUpdateWorkspaceAction(
  obj: Record<string, unknown>,
  prefix: string
): ValidationResult<UpdateWorkspaceAction> {
  const action: UpdateWorkspaceAction = {
    type: 'update_workspace',
  };

  // Optional: title
  if ('title' in obj && obj.title !== undefined) {
    if (typeof obj.title !== 'string') {
      return { valid: false, error: `${prefix}: Field "title" must be a string` };
    }
    if (obj.title.trim() === '') {
      return { valid: false, error: `${prefix}: Field "title" must not be empty when provided` };
    }
    action.title = obj.title;
  }

  // Optional: description (can be empty string)
  if ('description' in obj && obj.description !== undefined) {
    if (typeof obj.description !== 'string') {
      return { valid: false, error: `${prefix}: Field "description" must be a string` };
    }
    action.description = obj.description;
  }

  // Optional: workingDirectory
  if ('workingDirectory' in obj && obj.workingDirectory !== undefined) {
    if (typeof obj.workingDirectory !== 'string') {
      return { valid: false, error: `${prefix}: Field "workingDirectory" must be a string` };
    }
    action.workingDirectory = obj.workingDirectory;
  }

  // Optional: notifyOnError
  if ('notifyOnError' in obj && obj.notifyOnError !== undefined) {
    if (typeof obj.notifyOnError !== 'boolean') {
      return { valid: false, error: `${prefix}: Field "notifyOnError" must be a boolean` };
    }
    action.notifyOnError = obj.notifyOnError;
  }

  // Optional: notifyOnInReview
  if ('notifyOnInReview' in obj && obj.notifyOnInReview !== undefined) {
    if (typeof obj.notifyOnInReview !== 'boolean') {
      return { valid: false, error: `${prefix}: Field "notifyOnInReview" must be a boolean` };
    }
    action.notifyOnInReview = obj.notifyOnInReview;
  }

  return { valid: true, data: action };
}

/**
 * Validate rename_chat action
 */
function validateRenameChatAction(
  obj: Record<string, unknown>,
  prefix: string
): ValidationResult<RenameChatAction> {
  // Required: title
  if (!('title' in obj)) {
    return { valid: false, error: `${prefix}: Missing required field: title` };
  }
  if (typeof obj.title !== 'string') {
    return { valid: false, error: `${prefix}: Field "title" must be a string` };
  }
  if (obj.title.trim() === '') {
    return { valid: false, error: `${prefix}: Field "title" must not be empty` };
  }

  return {
    valid: true,
    data: {
      type: 'rename_chat',
      title: obj.title,
    },
  };
}

/**
 * Generate system comment for CLI errors
 */
export function generateErrorComment(exitCode: number, stderr?: string): string {
  if (stderr && stderr.trim()) {
    return `CLI exited with code ${exitCode}. ${stderr.trim()}`;
  }
  return `CLI exited with code ${exitCode}.`;
}
