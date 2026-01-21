import type { Database } from "bun:sqlite";

import type { Migration } from "../types";

const migration: Migration = {
  version: 1737470400,
  name: "create_agents_table",
  up(db: Database) {
    db.run(`
      CREATE TABLE agents (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        instruction TEXT NOT NULL,
        cli_type TEXT NOT NULL CHECK (cli_type IN ('claude', 'gemini', 'codex', 'opencode')),
        "order" INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX idx_agents_workspace_id ON agents(workspace_id)`);
    db.run(
      `CREATE INDEX idx_agents_workspace_order ON agents(workspace_id, "order")`,
    );
  },
};

export default migration;
