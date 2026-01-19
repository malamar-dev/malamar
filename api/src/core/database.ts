import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Database } from 'bun:sqlite';

import { getConfig } from './config.ts';
import { logger } from './logger.ts';

let dbInstance: Database | null = null;

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
  if (dbInstance) {
    return dbInstance;
  }

  const path = dbPath ?? getDbPath();
  ensureDataDirectory(path);

  dbInstance = new Database(path);
  initializePragmas(dbInstance);
  logger.info('Database initialized', { path });

  return dbInstance;
}

export function getDb(): Database {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}

export function resetDb(): void {
  dbInstance = null;
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
