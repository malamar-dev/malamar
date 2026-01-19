import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';

import { closeDb, initDb, resetDb, runMigrations } from '../../src/core/database.ts';

let testDbPath: string | null = null;
let testDb: Database | null = null;

export function getTestDbPath(): string {
  if (!testDbPath) {
    const testDir = join(tmpdir(), 'malamar-test');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    testDbPath = join(testDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  }
  return testDbPath;
}

export function setupTestDb(): Database {
  const dbPath = getTestDbPath();
  testDb = initDb(dbPath);

  // Enable foreign keys for cascade delete to work
  testDb.exec('PRAGMA foreign_keys = ON;');

  // Run migrations
  runMigrations(join(process.cwd(), 'migrations'));

  return testDb;
}

export function getTestDb(): Database {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return testDb;
}

export function cleanupTestDb(): void {
  closeDb();
  resetDb();
  if (testDbPath && existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true });
    // Also remove WAL and SHM files if they exist
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (existsSync(walPath)) rmSync(walPath, { force: true });
    if (existsSync(shmPath)) rmSync(shmPath, { force: true });
  }

  testDbPath = null;
  testDb = null;
}

export function clearTables(): void {
  const db = getTestDb();
  // Clear tables in reverse order of dependencies
  db.exec('DELETE FROM chat_queue');
  db.exec('DELETE FROM chat_messages');
  db.exec('DELETE FROM chats');
  db.exec('DELETE FROM task_queue');
  db.exec('DELETE FROM task_logs');
  db.exec('DELETE FROM task_comments');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM agents');
  db.exec('DELETE FROM workspaces');
}
