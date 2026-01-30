import { killAllChatProcesses, runChatProcessor } from "./chat-processor";
import { runCliHealthCheck } from "./cli-health-check";
import { killAllTaskProcesses, runTaskProcessor } from "./task-processor";

const CLI_HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const CHAT_PROCESSOR_INTERVAL_MS = parseInt(
  process.env.MALAMAR_RUNNER_POLL_INTERVAL ?? "1000",
  10,
);
const TASK_PROCESSOR_INTERVAL_MS = parseInt(
  process.env.MALAMAR_RUNNER_POLL_INTERVAL ?? "1000",
  10,
);

let healthCheckIntervalId: Timer | null = null;
let chatProcessorIntervalId: Timer | null = null;
let taskProcessorIntervalId: Timer | null = null;
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

  // Set up interval for recurring health checks
  healthCheckIntervalId = setInterval(() => {
    if (!signal.aborted) {
      void runCliHealthCheck(signal);
    }
  }, CLI_HEALTH_CHECK_INTERVAL_MS);

  // Set up interval for chat processor
  chatProcessorIntervalId = setInterval(() => {
    if (!signal.aborted) {
      void runChatProcessor(signal);
    }
  }, CHAT_PROCESSOR_INTERVAL_MS);

  // Set up interval for task processor
  taskProcessorIntervalId = setInterval(() => {
    if (!signal.aborted) {
      void runTaskProcessor(signal);
    }
  }, TASK_PROCESSOR_INTERVAL_MS);

  console.log("[Jobs] Background jobs started");
}

export function stopBackgroundJobs(): void {
  if (!isRunning) {
    return;
  }

  // Signal abort to any in-flight jobs
  abortController?.abort();
  abortController = null;

  // Clear timers
  if (initialTimeoutId) {
    clearTimeout(initialTimeoutId);
    initialTimeoutId = null;
  }

  if (healthCheckIntervalId) {
    clearInterval(healthCheckIntervalId);
    healthCheckIntervalId = null;
  }

  if (chatProcessorIntervalId) {
    clearInterval(chatProcessorIntervalId);
    chatProcessorIntervalId = null;
  }

  if (taskProcessorIntervalId) {
    clearInterval(taskProcessorIntervalId);
    taskProcessorIntervalId = null;
  }

  // Kill all active CLI processes
  killAllChatProcesses();
  killAllTaskProcesses();

  isRunning = false;
  console.log("[Jobs] Background jobs stopped");
}

export { killChatProcess, killChatProcessesForChatIds } from "./chat-processor";
export { killTaskProcess, killTaskProcessesForTaskIds } from "./task-processor";
export { runCliHealthCheck };
