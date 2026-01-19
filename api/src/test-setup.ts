// Test setup file
// This file provides utilities for setting up isolated test databases

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database } from 'bun:sqlite';

import { initDb, runMigrations } from './core/database.ts';

// Store test database paths for cleanup
const testDatabases: string[] = [];

/**
 * Create an isolated test database for a test suite.
 * Each call creates a new database file with a unique name.
 *
 * @param suiteName - A name for the test suite (used in the path)
 * @returns The initialized database instance
 */
export function createTestDatabase(suiteName: string): Database {
  const testDir = join(tmpdir(), `malamar-${suiteName}`);
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }

  const dbPath = join(testDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  testDatabases.push(dbPath);

  // initDb with a path will always set the singleton to use this database
  const db = initDb(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  runMigrations(join(process.cwd(), 'migrations'), db);

  return db;
}

/**
 * Clean up test database files.
 * Call this in afterAll() to remove temporary database files.
 * NOTE: This does NOT close the database - let bun handle that on exit.
 *
 * @param dbPath - The path to the database file to clean up
 */
export function cleanupTestDatabase(dbPath: string): void {
  // Don't close the database - other tests may still be using the singleton
  // Just clean up the files
  if (existsSync(dbPath)) {
    try {
      rmSync(dbPath, { force: true });
      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;
      if (existsSync(walPath)) rmSync(walPath, { force: true });
      if (existsSync(shmPath)) rmSync(shmPath, { force: true });
    } catch {
      // Ignore cleanup errors - files will be cleaned up by OS
    }
  }
}
