-- Migration 003: Chats, Messages, and Chat Queue tables

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    agent_id TEXT,
    cli_type TEXT CHECK (cli_type IS NULL OR cli_type IN ('claude', 'gemini', 'codex', 'opencode')),
    title TEXT NOT NULL DEFAULT 'Untitled chat',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
    message TEXT NOT NULL,
    actions TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Chat Queue table
CREATE TABLE IF NOT EXISTS chat_queue (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Indexes for chats
CREATE INDEX IF NOT EXISTS idx_chats_workspace_id ON chats(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chats_agent_id ON chats(agent_id);

-- Indexes for chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_role ON chat_messages(chat_id, role);

-- Indexes for chat queue
CREATE INDEX IF NOT EXISTS idx_chat_queue_chat_id ON chat_queue(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_queue_workspace_id ON chat_queue(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_queue_status ON chat_queue(status);
