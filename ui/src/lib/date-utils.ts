const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 30) {
    return 'just now';
  }

  if (diffInSeconds < MINUTE) {
    return `${diffInSeconds} sec ago`;
  }

  if (diffInSeconds < HOUR) {
    const minutes = Math.floor(diffInSeconds / MINUTE);
    return `${minutes} min ago`;
  }

  if (diffInSeconds < DAY) {
    const hours = Math.floor(diffInSeconds / HOUR);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  if (diffInSeconds < WEEK) {
    const days = Math.floor(diffInSeconds / DAY);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  // If more than a week but same year, show month and day
  const isSameYear = d.getFullYear() === now.getFullYear();

  if (isSameYear) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(d);
  }

  // Different year, show full date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatAbsoluteTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}
