import { nanoid } from "nanoid";

/**
 * Generate a unique ID using nanoid.
 * Returns a 21-character URL-safe string.
 */
export function generateId(): string {
  return nanoid();
}
