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
}

const state: ServerState = {
  process: null,
  db: null,
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
async function waitForHealthy(maxAttempts: number = 30, delayMs: number = 500): Promise<void> {
  const healthUrl = `${getBaseUrl()}/api/health`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const data = (await response.json()) as { data: { status: string } };
        if (data.data?.status === 'ok') {
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
 * Start the test server
 *
 * This will:
 * 1. Clean the test data directory
 * 2. Create the test data directory
 * 3. Spawn the server process with test configuration
 * 4. Wait for the server to be healthy
 */
export async function startServer(): Promise<void> {
  if (state.process) {
    throw new Error('Test server is already running');
  }

  // Clean and create test data directory
  cleanTestData();
  createTestDataDir();

  // Spawn the server process
  state.process = Bun.spawn(['bun', 'run', 'src/index.ts'], {
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
  try {
    await waitForHealthy();
  } catch (error) {
    // If health check fails, stop the server and rethrow
    await stopServer();
    throw error;
  }
}

/**
 * Stop the test server
 *
 * This will:
 * 1. Kill the server process
 * 2. Close any open database connections
 * 3. Clean the test data directory
 */
export async function stopServer(): Promise<void> {
  // Close database connection if open
  if (state.db) {
    state.db.close();
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

  // Clean test data
  cleanTestData();
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
    state.db = new Database(dbPath, { readonly: true });
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
    state.db.close();
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
