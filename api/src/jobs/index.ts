import { runCliHealthCheck } from "./cli-health-check";

const CLI_HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let intervalId: Timer | null = null;
let initialTimeoutId: Timer | null = null;
let abortController: AbortController | null = null;
let isRunning = false;

export function startBackgroundJobs(): void {
  if (isRunning) {
    console.warn("[Jobs] Background jobs already running");
    return;
  }

  isRunning = true;
  abortController = new AbortController();
  const signal = abortController.signal;

  // Run health check immediately (non-blocking)
  initialTimeoutId = setTimeout(() => {
    initialTimeoutId = null;
    if (!signal.aborted) {
      void runCliHealthCheck(signal);
    }
  }, 0);

  // Set up interval for recurring checks
  intervalId = setInterval(() => {
    if (!signal.aborted) {
      void runCliHealthCheck(signal);
    }
  }, CLI_HEALTH_CHECK_INTERVAL_MS);

  console.log("[Jobs] Background jobs started");
}

export function stopBackgroundJobs(): void {
  if (!isRunning) {
    return;
  }

  // Signal abort to any in-flight health checks
  abortController?.abort();
  abortController = null;

  // Clear timers
  if (initialTimeoutId) {
    clearTimeout(initialTimeoutId);
    initialTimeoutId = null;
  }

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  isRunning = false;
  console.log("[Jobs] Background jobs stopped");
}

export { runCliHealthCheck };
