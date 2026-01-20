import { Database } from "bun:sqlite";

import { ensureDataDirectory, getDatabasePath } from "./helpers/data-dir";
import { runMigrations } from "./migrations";

let db: Database | null = null;

/**
 * Get the initialized database instance.
 * Throws if database has not been initialized.
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

/**
 * Initialize the database connection, configure SQLite settings, and run migrations.
 * Should be called once at application startup before starting the server.
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  await ensureDataDirectory();
  const dbPath = getDatabasePath();

  console.log(`[Database] Opening database at ${dbPath}`);
  db = new Database(dbPath);

  // Configure SQLite for better performance
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA synchronous = NORMAL;");
  db.run("PRAGMA busy_timeout = 5000;");

  // Run migrations
  runMigrations(db);

  console.log("[Database] Initialization complete");
  return db;
}

/**
 * Close the database connection.
 * Should be called during application shutdown.
 */
export function closeDatabase(): void {
  if (db) {
    console.log("[Database] Closing database connection");
    db.close();
    db = null;
  }
}
