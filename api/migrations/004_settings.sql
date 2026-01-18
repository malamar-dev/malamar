-- Migration 004: Settings table

-- Settings table (key-value store with JSON values)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_on_error', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_on_in_review', 'true');
