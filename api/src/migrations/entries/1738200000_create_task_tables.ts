import type { Database } from "bun:sqlite";

import type { Migration } from "../types";

const migration: Migration = {
  version: 1738200000,
  name: "create_task_tables",
  up(db: Database) {
    // 1. Create tasks table
    db.run(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id)`);
    db.run(
      `CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status)`,
    );
    db.run(`CREATE INDEX idx_tasks_updated_at ON tasks(updated_at)`);

    // 2. Create task_comments table
    db.run(`
      CREATE TABLE task_comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        user_id TEXT,
        agent_id TEXT,
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
      )
    `);
    db.run(`CREATE INDEX idx_task_comments_task_id ON task_comments(task_id)`);
    db.run(
      `CREATE INDEX idx_task_comments_workspace_id ON task_comments(workspace_id)`,
    );

    // 3. Create task_logs table
    db.run(`
      CREATE TABLE task_logs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
        actor_id TEXT,
        metadata TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX idx_task_logs_task_id ON task_logs(task_id)`);
    db.run(
      `CREATE INDEX idx_task_logs_workspace_id ON task_logs(workspace_id)`,
    );

    // 4. Create task_queue table
    db.run(`
      CREATE TABLE task_queue (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
        is_priority INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX idx_task_queue_task_id ON task_queue(task_id)`);
    db.run(
      `CREATE INDEX idx_task_queue_workspace_id ON task_queue(workspace_id)`,
    );
    db.run(`CREATE INDEX idx_task_queue_status ON task_queue(status)`);
    db.run(
      `CREATE INDEX idx_task_queue_pickup ON task_queue(workspace_id, status, is_priority, updated_at)`,
    );
  },
};

export default migration;
