import type { Database } from "bun:sqlite";

import type { Migration } from "../types";

const migration: Migration = {
  version: 1738500000,
  name: "add_notification_settings_to_workspaces",
  up(db: Database) {
    // Add per-workspace notification toggle columns
    // Default to true (enabled) to match global defaults
    db.run(`
      ALTER TABLE workspaces
      ADD COLUMN notify_on_error INTEGER NOT NULL DEFAULT 1
    `);

    db.run(`
      ALTER TABLE workspaces
      ADD COLUMN notify_on_in_review INTEGER NOT NULL DEFAULT 1
    `);
  },
};

export default migration;
