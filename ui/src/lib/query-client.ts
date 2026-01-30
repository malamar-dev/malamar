import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "./api-client";

/**
 * Extract error message from various error formats.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Determine if an error is retryable.
 * Network errors and 5xx server errors are retryable.
 * 4xx client errors (validation, not found, etc.) are not retryable.
 */
function isRetryableError(error: unknown): boolean {
  // Network errors (fetch failed, no response)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // ApiError with 5xx status codes are retryable
  if (error instanceof ApiError) {
    return error.status >= 500;
  }

  // Unknown errors - don't retry to be safe
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry up to 2 times for retryable errors
        if (failureCount >= 2) {
          return false;
        }
        return isRetryableError(error);
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s
        return Math.min(1000 * Math.pow(2, attemptIndex), 2000);
      },
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      // Show error toast for failed mutations
      toast.error("Operation failed", {
        description: getErrorMessage(error),
      });
    },
  }),
});
