import type { Database } from "bun:sqlite";

import type { Migration } from "../types";

const migration: Migration = {
  version: 1737384600,
  name: "create_workspaces_table",
  up(db: Database) {
    db.run(`
      CREATE TABLE workspaces (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        last_activity_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_workspaces_title ON workspaces(title);
      CREATE INDEX idx_workspaces_last_activity_at ON workspaces(last_activity_at);
    `);
  },
};

export default migration;
