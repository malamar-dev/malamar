import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const MALAMAR_TMP_PREFIX = "malamar_";

/**
 * Create a random temporary directory for isolated CLI execution.
 * Returns the full path to the created directory.
 */
export async function createRandomTemporaryDir(): Promise<string> {
  const dirName = `${MALAMAR_TMP_PREFIX}${crypto.randomUUID()}`;
  const dirPath = join(tmpdir(), dirName);
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Create a temporary directory for a specific task.
 * Format: /tmp/malamar_task_{taskId}
 */
export async function createTaskTemporaryDir(taskId: string): Promise<string> {
  const dirPath = join(tmpdir(), `${MALAMAR_TMP_PREFIX}task_${taskId}`);
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Create a temporary directory for a specific chat.
 * Format: /tmp/malamar_chat_{chatId}
 */
export async function createChatTemporaryDir(chatId: string): Promise<string> {
  const dirPath = join(tmpdir(), `${MALAMAR_TMP_PREFIX}chat_${chatId}`);
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Validates that a path is a safe Malamar temporary path.
 * Returns true only if:
 * 1. The path is directly inside the system temp directory (no subdirectories)
 * 2. The path name starts with the Malamar prefix
 */
function isSafeMalamarTempPath(path: string): boolean {
  const normalizedPath = resolve(path);
  const tempDir = resolve(tmpdir());

  // Check that the parent directory is exactly the temp directory
  const parentDir = resolve(normalizedPath, "..");
  if (parentDir !== tempDir) {
    return false;
  }

  // Check that the path name starts with our prefix
  const pathName = basename(normalizedPath);
  return pathName.startsWith(MALAMAR_TMP_PREFIX);
}

/**
 * Remove a temporary path (file or directory).
 * Async, ignores errors. Only removes paths in temp dir with malamar_ prefix.
 */
export function removeTemporaryPath(path: string | null): void {
  if (!path || !isSafeMalamarTempPath(path)) return;

  setTimeout(() => {
    rm(path, { recursive: true, force: true }).catch(() => {});
  }, 0);
}
