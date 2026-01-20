export type ErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR";

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
