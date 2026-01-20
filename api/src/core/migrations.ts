import type { Database } from "bun:sqlite";

import { migrations } from "../migrations";

export function runMigrations(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const result = db
    .query<
      { max_version: number | null },
      []
    >("SELECT MAX(version) as max_version FROM _migrations")
    .get();
  const maxApplied = result?.max_version ?? 0;

  const pending = migrations
    .filter((m) => m.version > maxApplied)
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    console.log("[Migrations] No pending migrations");
    return;
  }

  console.log(`[Migrations] Found ${pending.length} pending migration(s)`);

  for (const migration of pending) {
    const fullName = `${migration.version}_${migration.name}`;
    console.log(`[Migrations] Running ${fullName}...`);

    try {
      migration.up(db);
      db.prepare("INSERT INTO _migrations (version) VALUES (?)").run(
        migration.version,
      );
      console.log(`[Migrations] Completed ${fullName}`);
    } catch (error) {
      console.error(`[Migrations] Failed ${fullName}:`, error);
      throw error;
    }
  }

  console.log("[Migrations] All migrations completed successfully");
}
