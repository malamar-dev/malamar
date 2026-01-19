import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Database } from 'bun:sqlite';

import { getConfig } from './config.ts';
import { logger } from './logger.ts';

// Track database instances by path for parallel test support
// Each test file can have its own database without interfering with others
const dbInstances = new Map<string, Database>();
let currentDbPath: string | null = null;

function initializePragmas(db: Database): void {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');
}

function ensureDataDirectory(dbPath: string): void {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    logger.info('Created data directory', { path: dir });
  }
}

export function getDbPath(): string {
  const config = getConfig();
  return join(config.dataDir, 'malamar.db');
}

export function initDb(dbPath?: string): Database {
  const path = dbPath ?? getDbPath();

  // Check if we already have an instance for this path
  const existing = dbInstances.get(path);
  if (existing) {
    currentDbPath = path;
    return existing;
  }

  ensureDataDirectory(path);
  const db = new Database(path);
  initializePragmas(db);

  dbInstances.set(path, db);
  currentDbPath = path;
  logger.info('Database initialized', { path });

  return db;
}

export function getDb(): Database {
  // If we have a current path, return that database
  if (currentDbPath) {
    const db = dbInstances.get(currentDbPath);
    if (db) {
      return db;
    }
  }

  // Fall back to initializing with default path
  return initDb();
}

export function closeDb(dbPath?: string): void {
  const pathToClose = dbPath ?? currentDbPath;
  if (pathToClose) {
    const db = dbInstances.get(pathToClose);
    if (db) {
      db.close();
      dbInstances.delete(pathToClose);
      logger.info('Database connection closed');
    }
    // Only reset currentDbPath if we're closing the current database
    if (pathToClose === currentDbPath) {
      currentDbPath = null;
    }
  }
}

export function resetDb(): void {
  currentDbPath = null;
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  return db.transaction(fn)();
}

// Migration types
interface MigrationRow {
  version: number;
  applied_at: string;
}

function ensureMigrationsTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function getAppliedVersions(db: Database): Set<number> {
  const rows = db.query<MigrationRow, []>('SELECT version FROM _migrations ORDER BY version').all();
  return new Set(rows.map((r) => r.version));
}

function recordMigration(db: Database, version: number): void {
  db.query('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)').run(
    version,
    new Date().toISOString()
  );
}

export interface MigrationFile {
  version: number;
  filename: string;
  path: string;
}

export function getMigrationFiles(migrationsDir: string): MigrationFile[] {
  if (!existsSync(migrationsDir)) {
    return [];
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .map((filename) => {
      const match = filename.match(/^(\d+)/);
      if (!match?.[1]) return null;
      const version = parseInt(match[1], 10);
      return {
        version,
        filename,
        path: join(migrationsDir, filename),
      };
    })
    .filter((f): f is MigrationFile => f !== null)
    .sort((a, b) => a.version - b.version);

  return files;
}

export function runMigrations(migrationsDir?: string, database?: Database): void {
  const db = database ?? getDb();
  const dir = migrationsDir ?? join(process.cwd(), 'migrations');

  ensureMigrationsTable(db);
  const applied = getAppliedVersions(db);
  const migrations = getMigrationFiles(dir);

  const pending = migrations.filter((m) => !applied.has(m.version));

  if (pending.length === 0) {
    logger.debug('No pending migrations');
    return;
  }

  logger.info('Running migrations', { count: pending.length });

  for (const migration of pending) {
    logger.info('Applying migration', { version: migration.version, file: migration.filename });

    try {
      const sql = readFileSync(migration.path, 'utf-8');
      db.exec(sql);
      recordMigration(db, migration.version);
      logger.info('Migration applied', { version: migration.version });
    } catch (error) {
      logger.error('Migration failed', {
        version: migration.version,
        file: migration.filename,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  logger.info('All migrations applied successfully');
}

export function getMaxAppliedVersion(): number {
  const db = getDb();
  ensureMigrationsTable(db);
  const row = db
    .query<
      { max_version: number | null },
      []
    >('SELECT MAX(version) as max_version FROM _migrations')
    .get();
  return row?.max_version ?? 0;
}
