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

-- Reward articles (CMS). Reading one to completion grants roulette tickets
-- (the shared "token" currency spun in the same roulette as game rewards).
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  cover_image TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  min_read_seconds INTEGER NOT NULL DEFAULT 30,
  reward_tickets INTEGER NOT NULL DEFAULT 1,
  reward_coins INTEGER NOT NULL DEFAULT 15,
  reward_xp INTEGER NOT NULL DEFAULT 15,
  quiz_question TEXT,
  quiz_choices_json TEXT,
  quiz_correct_index INTEGER,
  published INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per (user, article), enforced by the UNIQUE key, so the reward can
-- only ever be granted once per article per account. session_token +
-- started_at are set server-side when reading begins and checked again on
-- completion so the reward timer can't be spoofed from the client.
CREATE TABLE IF NOT EXISTS article_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reading', -- reading | completed
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  ip_hash TEXT,
  flagged INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, article_id)
);

-- Tebak Skor: score-prediction contest for esports matches (e.g. MPL).
CREATE TABLE IF NOT EXISTS esports_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league TEXT NOT NULL DEFAULT 'MPL ID',
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  team_a_logo TEXT NOT NULL DEFAULT '',
  team_b_logo TEXT NOT NULL DEFAULT '',
  best_of INTEGER NOT NULL DEFAULT 3,
  match_time TEXT NOT NULL,
  score_a INTEGER,
  score_b INTEGER,
  settled INTEGER NOT NULL DEFAULT 0,
  reward_exact_tickets INTEGER NOT NULL DEFAULT 5,
  reward_winner_tickets INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One prediction per (user, match). Predictions are only accepted while the
-- server clock is still before match_time (see routes/esports.js) -- the
-- client's clock is never trusted for the lock check.
CREATE TABLE IF NOT EXISTS match_predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES esports_matches(id) ON DELETE CASCADE,
  pred_score_a INTEGER NOT NULL,
  pred_score_b INTEGER NOT NULL,
  ip_hash TEXT,
  result TEXT, -- null until settled, then: exact | winner | wrong
  tickets_awarded INTEGER NOT NULL DEFAULT 0,
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, match_id)
);
`);

export default db;
