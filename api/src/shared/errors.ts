import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "AGENT_NOT_FOUND"
  | "AGENT_NOT_IN_WORKSPACE"
  | "CHAT_PROCESSING";

export interface ApiError {
  code: ErrorCode;
  message: string;
}

export interface ErrorResponse {
  error: ApiError;
}

/**
 * Create a standardized error response object.
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
): ErrorResponse {
  return {
    error: {
      code,
      message,
    },
  };
}

/**
 * Discriminated union Result type for service layer.
 * Use `ok()` and `err()` helpers to create results.
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ErrorCode };

/**
 * Create a success result.
 */
export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/**
 * Create an error result.
 */
export function err(error: string, code: ErrorCode): Result<never> {
  return { ok: false, error, code };
}

/**
 * Map error codes to HTTP status codes.
 */
export function httpStatusFromCode(code: ErrorCode): ContentfulStatusCode {
  switch (code) {
    case "NOT_FOUND":
    case "AGENT_NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
    case "AGENT_NOT_IN_WORKSPACE":
      return 400;
    case "CONFLICT":
    case "CHAT_PROCESSING":
      return 409;
    case "INTERNAL_ERROR":
      return 500;
  }
}
