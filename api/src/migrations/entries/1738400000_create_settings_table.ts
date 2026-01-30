import type { Database } from "bun:sqlite";

import type { Migration } from "../types";

const migration: Migration = {
  version: 1738400000,
  name: "create_settings_table",
  up(db: Database) {
    // Create settings table for key-value storage
    // Used for global settings like CLI configurations
    db.run(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
};

export default migration;
