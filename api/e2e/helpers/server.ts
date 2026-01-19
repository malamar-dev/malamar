import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import type { Subprocess } from 'bun';
import { Database } from 'bun:sqlite';

/**
 * E2E test constants
 */
export const TEST_PORT = 3457;
export const TEST_DATA_DIR = '/tmp/malamar-e2e-test';
export const TEST_HOST = '127.0.0.1';

/**
 * Server state
 */
interface ServerState {
  process: Subprocess | null;
  db: Database | null;
  isStarting: boolean;
  isStopping: boolean;
  startCount: number; // Track number of startServer calls for shared server
}

const state: ServerState = {
  process: null,
  db: null,
  isStarting: false,
  isStopping: false,
  startCount: 0,
};

/**
 * Get the base URL for the test server
 */
export function getBaseUrl(): string {
  return `http://${TEST_HOST}:${TEST_PORT}`;
}

/**
 * Clean up test data directory
 */
function cleanTestData(): void {
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true });
  }
}

/**
 * Create test data directory
 */
function createTestDataDir(): void {
  if (!existsSync(TEST_DATA_DIR)) {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
}

/**
 * Wait for the server to be healthy
 *
 * @param maxAttempts Maximum number of health check attempts
 * @param delayMs Delay between attempts in milliseconds
 */
async function waitForHealthy(maxAttempts: number = 60, delayMs: number = 500): Promise<void> {
  const healthUrl = `${getBaseUrl()}/api/health`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const data = (await response.json()) as { data: { status: string } };
        if (data.data?.status === 'ok') {
          // Add a small delay to ensure server is fully initialized
          await new Promise((resolve) => setTimeout(resolve, 100));
          return;
        }
      }
    } catch {
      // Server not ready yet, continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Server failed to become healthy after ${maxAttempts} attempts`);
}

/**
 * Wait for any pending start/stop operations to complete
 */
async function waitForPendingOperations(): Promise<void> {
  const maxWait = 30000; // 30 seconds max
  const start = Date.now();

  while (state.isStarting || state.isStopping) {
    if (Date.now() - start > maxWait) {
      throw new Error('Timeout waiting for pending server operations');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Start the test server
 *
 * This is reference-counted, so multiple test files can call startServer()
 * and the server will only be started once. The server is stopped when
 * the last reference calls stopServer().
 *
 * This will:
 * 1. Clean the test data directory (only on first start)
 * 2. Create the test data directory
 * 3. Spawn the server process with test configuration
 * 4. Wait for the server to be healthy
 */
export async function startServer(): Promise<void> {
  // Wait for any pending operations
  await waitForPendingOperations();

  // If server is already running, just increment the reference count
  if (state.process) {
    state.startCount++;
    // Verify server is still healthy
    try {
      await waitForHealthy(10, 200);
    } catch {
      // Server died, need to restart
      state.process = null;
      state.startCount = 0;
    }
    if (state.process) {
      return;
    }
  }

  state.isStarting = true;

  try {
    // Clean and create test data directory
    cleanTestData();
    createTestDataDir();

    // Spawn the server process
    state.process = Bun.spawn(['bun', 'run', 'index.ts'], {
      cwd: join(import.meta.dir, '../..'),
      env: {
        ...process.env,
        MALAMAR_HOST: TEST_HOST,
        MALAMAR_PORT: String(TEST_PORT),
        MALAMAR_DATA_DIR: TEST_DATA_DIR,
        MALAMAR_LOG_LEVEL: 'warn', // Reduce log noise during tests
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Wait for the server to be healthy
    await waitForHealthy();
    state.startCount = 1;
  } catch (error) {
    // If startup fails, clean up
    if (state.process) {
      state.process.kill();
      state.process = null;
    }
    state.startCount = 0;
    throw error;
  } finally {
    state.isStarting = false;
  }
}

/**
 * Stop the test server
 *
 * This is reference-counted. The server is only stopped when
 * the last reference calls stopServer().
 *
 * This will:
 * 1. Decrement reference count
 * 2. If count reaches 0:
 *    - Kill the server process
 *    - Close any open database connections
 *    - Clean the test data directory
 */
export async function stopServer(): Promise<void> {
  // Wait for any pending operations
  await waitForPendingOperations();

  // Decrement reference count
  if (state.startCount > 1) {
    state.startCount--;
    return;
  }

  state.isStopping = true;

  try {
    // Close database connection if open
    if (state.db) {
      try {
        state.db.close();
      } catch {
        // Ignore close errors
      }
      state.db = null;
    }

    // Kill server process
    if (state.process) {
      state.process.kill();

      // Wait for process to exit
      try {
        await Promise.race([
          state.process.exited,
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      } catch {
        // Process may already be dead
      }

      state.process = null;
    }

    state.startCount = 0;

    // Clean test data
    cleanTestData();

    // Brief delay to ensure cleanup is complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally {
    state.isStopping = false;
  }
}

/**
 * Get a read-only database connection for assertions
 *
 * Note: This should only be used for reading data during tests,
 * not for modifying data (use the API for that).
 */
export function getDb(): Database {
  if (!state.db) {
    const dbPath = join(TEST_DATA_DIR, 'malamar.db');

    // Verify database file exists before trying to open
    if (!existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}. Is the server running?`);
    }

    try {
      state.db = new Database(dbPath, { readonly: true });
    } catch (error) {
      throw new Error(
        `Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  return state.db;
}

/**
 * Reset the database connection
 *
 * This should be called between tests that modify the database
 * to ensure fresh reads.
 */
export function resetDbConnection(): void {
  if (state.db) {
    try {
      state.db.close();
    } catch {
      // Ignore close errors
    }
    state.db = null;
  }
}

/**
 * Make a GET request to the test server
 */
export async function get<T>(path: string): Promise<{ status: number; data: T }> {
  const response = await fetch(`${getBaseUrl()}${path}`);
  const json = (await response.json()) as T;
  return { status: response.status, data: json };
}

/**
 * Make a POST request to the test server
 */
export async function post<T>(
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as T;
  return { status: response.status, data: json };
}

/**
 * Make a PUT request to the test server
 */
export async function put<T>(
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as T;
  return { status: response.status, data: json };
}

/**
 * Make a DELETE request to the test server
 */
export async function del<T>(path: string): Promise<{ status: number; data: T }> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'DELETE',
  });
  const json = (await response.json()) as T;
  return { status: response.status, data: json };
}
