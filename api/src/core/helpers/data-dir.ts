import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_DATA_DIR = ".malamar";
const DB_FILENAME = "malamar.db";

/**
 * Get the data directory path from environment or default to ~/.malamar
 */
export function getDataDir(): string {
  return process.env.MALAMAR_DATA_DIR ?? join(homedir(), DEFAULT_DATA_DIR);
}

/**
 * Get the full path to the SQLite database file
 */
export function getDatabasePath(): string {
  return join(getDataDir(), DB_FILENAME);
}

/**
 * Ensure the data directory exists, creating it if necessary.
 * Returns the data directory path.
 */
export async function ensureDataDirectory(): Promise<string> {
  const dataDir = getDataDir();
  await mkdir(dataDir, { recursive: true });
  return dataDir;
}
