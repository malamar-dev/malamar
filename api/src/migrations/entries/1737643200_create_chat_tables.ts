import type { Database } from "bun:sqlite";

import type { Migration } from "../types";

const migration: Migration = {
  version: 1737643200,
  name: "create_chat_tables",
  up(db: Database) {
    // 1. Create chats table
    db.run(`
      CREATE TABLE chats (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        agent_id TEXT,
        cli_type TEXT CHECK (cli_type IS NULL OR cli_type IN ('claude', 'gemini', 'codex', 'opencode')),
        title TEXT NOT NULL DEFAULT 'Untitled chat',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
      )
    `);
    db.run(`CREATE INDEX idx_chats_workspace_id ON chats(workspace_id)`);

    // 2. Create chat_messages table
    db.run(`
      CREATE TABLE chat_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
        message TEXT NOT NULL,
        actions TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id)`);

    // 3. Create chat_queue table
    db.run(`
      CREATE TABLE chat_queue (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX idx_chat_queue_chat_id ON chat_queue(chat_id)`);
    db.run(
      `CREATE INDEX idx_chat_queue_workspace_id ON chat_queue(workspace_id)`,
    );
    db.run(`CREATE INDEX idx_chat_queue_status ON chat_queue(status)`);
  },
};

export default migration;
