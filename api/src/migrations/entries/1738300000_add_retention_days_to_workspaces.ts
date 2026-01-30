import type { Database } from "bun:sqlite";

import type { Migration } from "../types";

const migration: Migration = {
  version: 1738300000,
  name: "add_retention_days_to_workspaces",
  up(db: Database) {
    // Add retention_days column with default 7 days
    // 0 means auto-cleanup disabled
    db.run(`
      ALTER TABLE workspaces
      ADD COLUMN retention_days INTEGER NOT NULL DEFAULT 7
    `);
  },
};

export default migration;
