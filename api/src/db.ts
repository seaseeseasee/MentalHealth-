import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DB_PATH ?? './data/mindease.db';
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    sex TEXT,
    avatar TEXT NOT NULL,
    notify_mood INTEGER NOT NULL DEFAULT 1,
    consent_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id TEXT NOT NULL,
    answers TEXT NOT NULL,
    sex TEXT,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    level TEXT NOT NULL,
    band_label TEXT NOT NULL,
    crisis INTEGER NOT NULL DEFAULT 0,
    domains TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS results_user ON results(user_id, created_at);

  CREATE TABLE IF NOT EXISTS moods (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    mood INTEGER NOT NULL,
    PRIMARY KEY (user_id, day)
  );
`);

// ---- Analytics & admin additions (additive only: new tables, one new column with a default) ----
function hasColumn(table: string, column: string): boolean {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
}
if (!hasColumn('users', 'role')) {
  // 'user' | 'analyst' (read-only dashboard) | 'admin'
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
}

db.exec(`
  -- One row per time a user opens a questionnaire. completed_at is set when the result is submitted.
  -- No answers are stored here.
  CREATE TABLE IF NOT EXISTS assessment_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    result_id INTEGER REFERENCES results(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS attempts_started ON assessment_attempts(started_at, assessment_id);
  CREATE INDEX IF NOT EXISTS attempts_user ON assessment_attempts(user_id, assessment_id, completed_at);

  -- Minimal usage log: no IP address and no raw user agent, only a device class.
  CREATE TABLE IF NOT EXISTS usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    device TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS usage_created ON usage_events(created_at, type);
  CREATE INDEX IF NOT EXISTS usage_user ON usage_events(user_id, created_at);

  CREATE INDEX IF NOT EXISTS results_created ON results(created_at, assessment_id);

  CREATE TABLE IF NOT EXISTS assessment_settings (
    assessment_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Remember when attempt/usage tracking began, so the dashboard can say data before this date does not exist.
db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('tracking_started_at', datetime('now'))`).run();
db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('min_group_size', '5')`).run();

db.exec(`DELETE FROM sessions WHERE expires_at < datetime('now')`);
