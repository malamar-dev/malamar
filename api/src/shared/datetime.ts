/**
 * Returns the current timestamp in ISO format
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Formats a date as a relative time string
 * Examples: "just now", "5 min ago", "2 hours ago", "3 days ago"
 */
export function formatRelative(date: Date | string): string {
  const then = typeof date === 'string' ? new Date(date) : date;
  const nowTime = Date.now();
  const diffMs = nowTime - then.getTime();

  // Handle future dates
  if (diffMs < 0) {
    return 'in the future';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  if (days < 7) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  if (weeks < 4) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Parses an ISO date string to a Date object
 */
export function parseIsoDate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Checks if a date string is a valid ISO date
 */
export function isValidIsoDate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}
