import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeUser } from '../utils/serialize.js';

const router = Router();

const DAILY_COINS = 50;
const DAILY_XP = 20;

router.get('/daily/status', requireAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = req.user.last_daily_claim === today;
  res.json({ claimedToday, coins: DAILY_COINS, xp: DAILY_XP });
});

router.post('/daily/claim', requireAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  if (req.user.last_daily_claim === today) {
    return res.status(400).json({ error: 'Reward harian sudah diambil hari ini.' });
  }
  db.prepare('UPDATE users SET coins = coins + ?, xp = xp + ?, last_daily_claim = ? WHERE id = ?').run(
    DAILY_COINS,
    DAILY_XP,
    today,
    req.user.id
  );
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, coinsAwarded: DAILY_COINS, xpAwarded: DAILY_XP, user: serializeUser(updatedUser) });
});

router.get('/leaderboard', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT username, avatar, xp, coins FROM users ORDER BY xp DESC, coins DESC LIMIT 20')
    .all();
  res.json({ leaderboard: rows });
});

export default router;
