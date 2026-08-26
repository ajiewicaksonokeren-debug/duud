import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { serializeMatch } from '../utils/serialize.js';
import { hashIp, rateLimit } from '../utils/antiCheat.js';

const router = Router();

const predictLimiter = rateLimit({ windowMs: 60_000, max: 15, keyFn: (req) => `predict:${req.user.id}` });

function getPrediction(userId, matchId) {
  return db.prepare('SELECT * FROM match_predictions WHERE user_id = ? AND match_id = ?').get(userId, matchId);
}

router.get('/matches', requireAuth, (req, res) => {
  const matches = db.prepare('SELECT * FROM esports_matches ORDER BY match_time DESC').all();
  res.json({
    matches: matches.map((m) => serializeMatch(m, { prediction: getPrediction(req.user.id, m.id) })),
  });
});

// Predictions are only ever accepted before match_time, checked against the
// server clock -- a spoofed client timestamp changes nothing here.
router.post('/matches/:id/predict', requireAuth, predictLimiter, (req, res) => {
  const match = db.prepare('SELECT * FROM esports_matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Pertandingan tidak ditemukan.' });
  if (match.settled || Date.now() >= new Date(match.match_time).getTime()) {
    return res.status(403).json({ error: 'Prediksi sudah ditutup, pertandingan sudah dimulai.' });
  }

  const scoreA = Number(req.body?.scoreA);
  const scoreB = Number(req.body?.scoreB);
  const maxScore = Math.ceil(match.best_of / 2);
  if (
    !Number.isInteger(scoreA) ||
    !Number.isInteger(scoreB) ||
    scoreA < 0 ||
    scoreB < 0 ||
    scoreA > maxScore ||
    scoreB > maxScore ||
    (scoreA === maxScore && scoreB === maxScore)
  ) {
    return res.status(400).json({ error: `Skor tidak valid untuk best-of-${match.best_of}.` });
  }

  const ipHash = hashIp(req);
  const existing = getPrediction(req.user.id, match.id);
  if (existing) {
    db.prepare(
      "UPDATE match_predictions SET pred_score_a = ?, pred_score_b = ?, ip_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(scoreA, scoreB, ipHash, existing.id);
  } else {
    db.prepare(
      'INSERT INTO match_predictions (user_id, match_id, pred_score_a, pred_score_b, ip_hash) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, match.id, scoreA, scoreB, ipHash);
  }

  res.json({ ok: true, match: serializeMatch(match, { prediction: getPrediction(req.user.id, match.id) }) });
});

router.get('/predictions/me', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, m.team_a, m.team_b, m.league, m.match_time, m.settled, m.score_a AS match_score_a, m.score_b AS match_score_b
       FROM match_predictions p JOIN esports_matches m ON m.id = p.match_id
       WHERE p.user_id = ? ORDER BY m.match_time DESC`
    )
    .all(req.user.id);
  res.json({
    predictions: rows.map((r) => ({
      matchId: r.match_id,
      league: r.league,
      teamA: r.team_a,
      teamB: r.team_b,
      matchTime: r.match_time,
      settled: !!r.settled,
      actualScoreA: r.settled ? r.match_score_a : null,
      actualScoreB: r.settled ? r.match_score_b : null,
      predScoreA: r.pred_score_a,
      predScoreB: r.pred_score_b,
      result: r.result,
      ticketsAwarded: r.tickets_awarded,
      coinsAwarded: r.coins_awarded,
      xpAwarded: r.xp_awarded,
    })),
  });
});

// --- Admin: manage matches ---

router.get('/admin/matches', requireAuth, requireAdmin, (req, res) => {
  const matches = db.prepare('SELECT * FROM esports_matches ORDER BY match_time DESC').all();
  res.json({ matches: matches.map((m) => serializeMatch(m)) });
});

router.post('/admin/matches', requireAuth, requireAdmin, (req, res) => {
  const { league, teamA, teamB, teamALogo, teamBLogo, bestOf, matchTime, rewardExactTickets, rewardWinnerTickets } =
    req.body || {};
  if (!teamA || !teamB || !matchTime) return res.status(400).json({ error: 'Tim A, Tim B, dan waktu wajib diisi.' });
  const info = db
    .prepare(
      `INSERT INTO esports_matches (league, team_a, team_b, team_a_logo, team_b_logo, best_of, match_time, reward_exact_tickets, reward_winner_tickets)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      league || 'MPL ID',
      teamA,
      teamB,
      teamALogo || '',
      teamBLogo || '',
      bestOf || 3,
      matchTime,
      rewardExactTickets ?? 5,
      rewardWinnerTickets ?? 1
    );
  res.status(201).json({ match: serializeMatch(db.prepare('SELECT * FROM esports_matches WHERE id = ?').get(info.lastInsertRowid)) });
});

router.put('/admin/matches/:id', requireAuth, requireAdmin, (req, res) => {
  const match = db.prepare('SELECT * FROM esports_matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Pertandingan tidak ditemukan.' });
  if (match.settled) return res.status(400).json({ error: 'Pertandingan yang sudah disettle tidak bisa diedit.' });
  const { league, teamA, teamB, teamALogo, teamBLogo, bestOf, matchTime, rewardExactTickets, rewardWinnerTickets } =
    req.body || {};
  db.prepare(
    `UPDATE esports_matches SET league = ?, team_a = ?, team_b = ?, team_a_logo = ?, team_b_logo = ?, best_of = ?, match_time = ?,
      reward_exact_tickets = ?, reward_winner_tickets = ? WHERE id = ?`
  ).run(
    league ?? match.league,
    teamA ?? match.team_a,
    teamB ?? match.team_b,
    teamALogo ?? match.team_a_logo,
    teamBLogo ?? match.team_b_logo,
    bestOf ?? match.best_of,
    matchTime ?? match.match_time,
    rewardExactTickets ?? match.reward_exact_tickets,
    rewardWinnerTickets ?? match.reward_winner_tickets,
    match.id
  );
  res.json({ match: serializeMatch(db.prepare('SELECT * FROM esports_matches WHERE id = ?').get(match.id)) });
});

router.delete('/admin/matches/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM esports_matches WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Settling pays out every prediction exactly once (guarded by `settled`) and
// only once the match has actually started, so a match can't be resolved
// before it happens.
router.post('/admin/matches/:id/settle', requireAuth, requireAdmin, (req, res) => {
  const match = db.prepare('SELECT * FROM esports_matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Pertandingan tidak ditemukan.' });
  if (match.settled) return res.status(400).json({ error: 'Pertandingan ini sudah disettle sebelumnya.' });
  if (Date.now() < new Date(match.match_time).getTime()) {
    return res.status(400).json({ error: 'Belum bisa disettle sebelum waktu pertandingan dimulai.' });
  }

  const scoreA = Number(req.body?.scoreA);
  const scoreB = Number(req.body?.scoreB);
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
    return res.status(400).json({ error: 'Skor akhir wajib diisi angka.' });
  }
  const actualWinner = scoreA > scoreB ? 'A' : 'B';

  const settle = db.transaction(() => {
    db.prepare('UPDATE esports_matches SET score_a = ?, score_b = ?, settled = 1 WHERE id = ?').run(scoreA, scoreB, match.id);

    const predictions = db.prepare('SELECT * FROM match_predictions WHERE match_id = ?').all(match.id);
    for (const p of predictions) {
      const predWinner = p.pred_score_a > p.pred_score_b ? 'A' : 'B';
      let result = 'wrong';
      let tickets = 0;
      if (p.pred_score_a === scoreA && p.pred_score_b === scoreB) {
        result = 'exact';
        tickets = match.reward_exact_tickets;
      } else if (predWinner === actualWinner) {
        result = 'winner';
        tickets = match.reward_winner_tickets;
      }
      const coins = tickets * 8;
      const xp = tickets * 8;

      db.prepare(
        "UPDATE match_predictions SET result = ?, tickets_awarded = ?, coins_awarded = ?, xp_awarded = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(result, tickets, coins, xp, p.id);

      if (tickets > 0) {
        db.prepare('UPDATE users SET coins = coins + ?, xp = xp + ?, roulette_tickets = roulette_tickets + ? WHERE id = ?').run(
          coins,
          xp,
          tickets,
          p.user_id
        );
      }
    }
  });
  settle();

  res.json({ match: serializeMatch(db.prepare('SELECT * FROM esports_matches WHERE id = ?').get(match.id)) });
});

// Predictions for one match, with a lightweight flag for many accounts
// sharing the same IP hash (manual review, not an automatic block).
router.get('/admin/matches/:id/predictions', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, u.username FROM match_predictions p JOIN users u ON u.id = p.user_id WHERE p.match_id = ? ORDER BY p.created_at ASC`
    )
    .all(req.params.id);
  const byIp = new Map();
  rows.forEach((r) => {
    if (!byIp.has(r.ip_hash)) byIp.set(r.ip_hash, new Set());
    byIp.get(r.ip_hash).add(r.user_id);
  });
  res.json({
    predictions: rows.map((r) => ({
      username: r.username,
      scoreA: r.pred_score_a,
      scoreB: r.pred_score_b,
      result: r.result,
      createdAt: r.created_at,
      accountsSharingIp: byIp.get(r.ip_hash).size,
    })),
  });
});

export default router;
