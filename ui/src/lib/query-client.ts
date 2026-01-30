import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
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
