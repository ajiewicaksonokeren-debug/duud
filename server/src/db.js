import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'tebak-gambar.sqlite');

// Uploaded images live next to the database file so a single mounted volume
// (see server/Dockerfile, DB_PATH) persists both across container restarts.
export const uploadsDir = process.env.UPLOADS_DIR || path.join(path.dirname(dbPath), 'uploads');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 100,
  xp INTEGER NOT NULL DEFAULT 0,
  player_level INTEGER NOT NULL DEFAULT 1,
  roulette_tickets INTEGER NOT NULL DEFAULT 0,
  avatar TEXT NOT NULL DEFAULT '🐣',
  last_daily_claim TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_index INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎮',
  description TEXT NOT NULL DEFAULT '',
  unlock_player_level INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Each question is one numbered "level" inside its category. Categories can
-- grow to thousands of levels over time as admins keep adding questions --
-- level_number is just the sequential position within the category.
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL DEFAULT 0,
  clues_json TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  reward_coins INTEGER NOT NULL DEFAULT 10,
  reward_xp INTEGER NOT NULL DEFAULT 10,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id, level_number);

CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  solved INTEGER NOT NULL DEFAULT 0,
  used_letter_hint INTEGER NOT NULL DEFAULT 0,
  used_answer_key INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS submitted_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clues_json TEXT NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code TEXT NOT NULL,
  players_json TEXT NOT NULL,
  winner_username TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Roulette gacha configuration. requires_claim prizes (diamonds, vouchers)
-- are fulfilled manually by the esportsku team through the public claim form;
-- non-claim prizes (coins) are credited to the user instantly.
CREATE TABLE IF NOT EXISTS roulette_prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎁',
  type TEXT NOT NULL DEFAULT 'coin', -- coin | diamond | voucher | none
  amount INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  requires_claim INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prize_id INTEGER REFERENCES roulette_prizes(id),
  prize_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Unique, single-use, expiring claim links opened via the in-app browser
-- (Custom Tabs) at https://tebakgambar.esportsku.com/rewards/id/:token
CREATE TABLE IF NOT EXISTS reward_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prize_id INTEGER REFERENCES roulette_prizes(id),
  prize_name TEXT NOT NULL,
  prize_type TEXT NOT NULL,
  prize_amount INTEGER NOT NULL DEFAULT 0,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | claimed | expired
  form_data_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  claimed_at TEXT
);

-- Rush Moment runs: questions are served one at a time and timed on the server.
CREATE TABLE IF NOT EXISTS rush_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_ids_json TEXT NOT NULL,
  idx INTEGER NOT NULL DEFAULT 0,
  started_ms INTEGER NOT NULL,
  served_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | won | lost
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'rush_meter')) {
  db.exec('ALTER TABLE users ADD COLUMN rush_meter INTEGER NOT NULL DEFAULT 0');
}

export default db;
