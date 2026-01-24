import { useCallback, useState } from "react";

import { useDebounce } from "./use-debounce";

interface UseSearchOptions {
  /** Debounce delay for search in ms */
  debounceDelay?: number;
}

interface UseSearchReturn {
  /** Current search query (raw, not debounced) */
  searchQuery: string;
  /** Debounced search query for API calls */
  debouncedQuery: string;
  /** Update search query */
  setSearchQuery: (query: string) => void;
  /** Clear search query */
  clearSearch: () => void;
}

const DEFAULT_DEBOUNCE_DELAY = 300;

/**
 * Hook for managing search state with debouncing.
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const { debounceDelay = DEFAULT_DEBOUNCE_DELAY } = options;

  const [searchQuery, setSearchQueryState] = useState("");
  const debouncedQuery = useDebounce(searchQuery, debounceDelay);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQueryState("");
  }, []);

  return {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    clearSearch,
  };
}

// Re-export for backwards compatibility if needed
export { useSearch as usePagination };
