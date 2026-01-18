import { nanoid } from 'nanoid';

/**
 * Generates a unique ID using nanoid (21 characters by default)
 */
export function generateId(): string {
  return nanoid();
}

/**
 * Mock user ID for system-generated actions (21 zeros)
 */
export const MOCK_USER_ID = '000000000000000000000';

/**
 * Expected length of generated IDs
 */
export const ID_LENGTH = 21;
