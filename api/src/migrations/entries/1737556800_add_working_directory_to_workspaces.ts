import type { Database } from "bun:sqlite";

import type { Migration } from "../types";

const migration: Migration = {
  version: 1737556800,
  name: "add_working_directory_to_workspaces",
  up(db: Database) {
    db.run(`
      ALTER TABLE workspaces
      ADD COLUMN working_directory TEXT DEFAULT NULL
    `);
  },
};

export default migration;
