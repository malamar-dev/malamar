/**
 * Cross-cutting types used by multiple modules
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Standard list response (non-paginated)
 */
export interface ListResponse<T> {
  data: T[];
}

/**
 * Empty response for delete operations
 */
export interface EmptyResponse {
  success: true;
}

/**
 * Timestamp fields common to most entities
 */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

/**
 * Entity with ID and timestamps
 */
export interface BaseEntity extends Timestamps {
  id: string;
}

/**
 * Query parameters for list endpoints
 */
export interface ListQueryParams {
  q?: string;
  limit?: number;
  offset?: number;
}
