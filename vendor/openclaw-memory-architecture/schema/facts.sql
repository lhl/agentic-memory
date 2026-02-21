-- facts.db schema — Structured memory for OpenClaw agents
-- SQLite + FTS5 for instant exact lookups and full-text search

CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,          -- "Alice", "MyProject", "decision", "convention"
    key TEXT NOT NULL,             -- "birthday", "stack", "always use trash"
    value TEXT NOT NULL,           -- "March 15, 1990", "Next.js + PostgreSQL", "recoverable > gone"
    category TEXT NOT NULL,        -- person, project, decision, convention, credential, preference, date, location
    source TEXT,                   -- where this fact came from: "conversation 2026-02-14", "USER.md"
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_accessed TEXT,            -- updated on every retrieval (for TTL/decay)
    access_count INTEGER DEFAULT 0,-- how often this fact is retrieved
    permanent BOOLEAN DEFAULT 0    -- 1 = never decays (birthdays, core decisions)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_facts_entity ON facts(entity);
CREATE INDEX IF NOT EXISTS idx_facts_category ON facts(category);
CREATE INDEX IF NOT EXISTS idx_facts_entity_key ON facts(entity, key);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
    entity, key, value,
    content=facts,
    content_rowid=id
);

-- Triggers to keep FTS index in sync with facts table
CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
    INSERT INTO facts_fts(rowid, entity, key, value)
    VALUES (new.id, new.entity, new.key, new.value);
END;

CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
    INSERT INTO facts_fts(facts_fts, rowid, entity, key, value)
    VALUES('delete', old.id, old.entity, old.key, old.value);
END;

CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON facts BEGIN
    INSERT INTO facts_fts(facts_fts, rowid, entity, key, value)
    VALUES('delete', old.id, old.entity, old.key, old.value);
    INSERT INTO facts_fts(rowid, entity, key, value)
    VALUES (new.id, new.entity, new.key, new.value);
END;
