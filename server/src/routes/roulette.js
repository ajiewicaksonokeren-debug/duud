import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { serializeUser, serializePrize, serializeClaim } from '../utils/serialize.js';

const router = Router();
const CLAIM_TTL_DAYS = 7;

function claimUrlFor(token) {
  const base = (process.env.CLAIM_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/rewards/id/${token}`;
}

function pickWeighted(prizes) {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * total;
  for (const p of prizes) {
    roll -= p.weight;
    if (roll <= 0) return p;
  }
  return prizes[prizes.length - 1];
}

router.get('/status', requireAuth, (req, res) => {
  res.json({ tickets: req.user.roulette_tickets });
});

router.get('/prizes', requireAuth, (req, res) => {
  const prizes = db.prepare('SELECT * FROM roulette_prizes WHERE active = 1 ORDER BY id ASC').all();
  res.json({ prizes: prizes.map((p) => serializePrize(p)) });
});

router.post('/spin', requireAuth, (req, res) => {
  if (req.user.roulette_tickets < 1) {
    return res.status(400).json({ error: 'Tiket roulette kamu habis. Selesaikan lebih banyak soal untuk dapat tiket!' });
  }

  const prizes = db.prepare('SELECT * FROM roulette_prizes WHERE active = 1 AND weight > 0').all();
  if (prizes.length === 0) return res.status(400).json({ error: 'Belum ada hadiah roulette yang aktif.' });

  const prize = pickWeighted(prizes);

  db.prepare('UPDATE users SET roulette_tickets = roulette_tickets - 1 WHERE id = ?').run(req.user.id);
  db.prepare('INSERT INTO spin_history (user_id, prize_id, prize_name) VALUES (?, ?, ?)').run(
    req.user.id,
    prize.id,
    prize.name
  );

  let claimUrl = null;

  if (prize.type === 'coin' && !prize.requires_claim) {
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(prize.amount, req.user.id);
  } else if (prize.requires_claim) {
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO reward_claims (user_id, prize_id, prize_name, prize_type, prize_amount, token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, prize.id, prize.name, prize.type, prize.amount, token, expiresAt);
    claimUrl = claimUrlFor(token);
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    prize: serializePrize(prize),
    claimUrl,
    user: serializeUser(updatedUser),
  });
});

router.get('/history', requireAuth, (req, res) => {
  const spins = db
    .prepare('SELECT * FROM spin_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id);
  const claims = db
    .prepare('SELECT * FROM reward_claims WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id);
  res.json({
    spins: spins.map((s) => ({ id: s.id, prizeName: s.prize_name, createdAt: s.created_at })),
    claims: claims.map((c) => ({ ...serializeClaim(c), claimUrl: claimUrlFor(c.token) })),
  });
});

// --- Admin: manage prizes ---

router.get('/admin/prizes', requireAuth, requireAdmin, (req, res) => {
  const prizes = db.prepare('SELECT * FROM roulette_prizes ORDER BY id ASC').all();
  res.json({ prizes: prizes.map((p) => serializePrize(p, { includeWeight: true })) });
});

router.post('/admin/prizes', requireAuth, requireAdmin, (req, res) => {
  const { name, icon, type, amount, weight, requiresClaim } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nama hadiah wajib diisi.' });
  const info = db
    .prepare(
      `INSERT INTO roulette_prizes (name, icon, type, amount, weight, requires_claim, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    )
    .run(name, icon || '🎁', type || 'coin', amount ?? 0, weight ?? 1, requiresClaim ? 1 : 0);
  const prize = db.prepare('SELECT * FROM roulette_prizes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ prize: serializePrize(prize, { includeWeight: true }) });
});

router.put('/admin/prizes/:id', requireAuth, requireAdmin, (req, res) => {
  const prize = db.prepare('SELECT * FROM roulette_prizes WHERE id = ?').get(req.params.id);
  if (!prize) return res.status(404).json({ error: 'Hadiah tidak ditemukan.' });
  const { name, icon, type, amount, weight, requiresClaim, active } = req.body || {};
  db.prepare(
    `UPDATE roulette_prizes SET name = ?, icon = ?, type = ?, amount = ?, weight = ?, requires_claim = ?, active = ?
     WHERE id = ?`
  ).run(
    name ?? prize.name,
    icon ?? prize.icon,
    type ?? prize.type,
    amount ?? prize.amount,
    weight ?? prize.weight,
    requiresClaim === undefined ? prize.requires_claim : requiresClaim ? 1 : 0,
    active === undefined ? prize.active : active ? 1 : 0,
    prize.id
  );
  res.json({
    prize: serializePrize(db.prepare('SELECT * FROM roulette_prizes WHERE id = ?').get(prize.id), {
      includeWeight: true,
    }),
  });
});

router.delete('/admin/prizes/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM roulette_prizes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin: review all reward claims (to fulfill diamonds/vouchers manually).
router.get('/admin/claims', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT rc.*, u.username FROM reward_claims rc JOIN users u ON u.id = rc.user_id ORDER BY rc.created_at DESC LIMIT 200`
    )
    .all();
  res.json({
    claims: rows.map((c) => ({ ...serializeClaim(c), username: c.username, claimUrl: claimUrlFor(c.token) })),
  });
});

export default router;
