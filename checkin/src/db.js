import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dbPath = process.env.DB_PATH || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'checkin.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Only customer_id (+ display name and segments from the CBN session exchange) is stored; all times are epoch ms (UTC).
db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  customer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  streak INTEGER NOT NULL DEFAULT 0,
  last_day TEXT,
  last_claimed_at INTEGER,
  milestones TEXT NOT NULL DEFAULT '[]',
  popup_dismissed_day TEXT,
  segments TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  day TEXT NOT NULL,
  claimed_at INTEGER NOT NULL,
  streak INTEGER NOT NULL,
  multiplier REAL NOT NULL,
  base INTEGER NOT NULL,
  level_bonus INTEGER NOT NULL,
  cycle_bonus INTEGER NOT NULL,
  milestone_bonus INTEGER NOT NULL,
  event_bonus INTEGER NOT NULL,
  total INTEGER NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  device TEXT NOT NULL DEFAULT '',
  UNIQUE (customer_id, day)
);
CREATE INDEX IF NOT EXISTS checkins_day ON checkins(day);
CREATE INDEX IF NOT EXISTS checkins_customer_time ON checkins(customer_id, claimed_at);
-- Mirror of published Strapi events (src/cms.js replaces it on every sync); id = Strapi id.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiplier','time_window','challenge')),
  value REAL NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  window_start TEXT,
  window_end TEXT,
  target_days INTEGER,
  segments TEXT NOT NULL DEFAULT '[]',
  banner_url TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
