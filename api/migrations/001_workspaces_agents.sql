-- Migration 001: Workspaces and Agents tables

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    working_directory_mode TEXT NOT NULL DEFAULT 'temp' CHECK (working_directory_mode IN ('static', 'temp')),
    working_directory_path TEXT,
    auto_delete_done_tasks INTEGER NOT NULL DEFAULT 1,
    retention_days INTEGER NOT NULL DEFAULT 7,
    notify_on_error INTEGER NOT NULL DEFAULT 1,
    notify_on_in_review INTEGER NOT NULL DEFAULT 1,
    last_activity_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    instruction TEXT NOT NULL,
    cli_type TEXT NOT NULL CHECK (cli_type IN ('claude', 'gemini', 'codex', 'opencode')),
    "order" INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE (workspace_id, name),
    UNIQUE (workspace_id, "order")
);

-- Index for agents by workspace
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);

-- Index for agents order lookup
CREATE INDEX IF NOT EXISTS idx_agents_workspace_order ON agents(workspace_id, "order");
