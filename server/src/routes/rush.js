import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeAnswer } from '../utils/normalize.js';
import { RUSH } from '../utils/rush.js';
import { createClaim } from './roulette.js';

const router = Router();
const SHORT_ANSWER = new RegExp(`^[A-Z]{1,${RUSH.maxLetters}}$`);

// Clues are revealed one question at a time, so nothing can be solved ahead of the clock.
function questionPayload(ids, idx) {
  const q = db.prepare('SELECT clues_json, answer FROM questions WHERE id = ?').get(ids[idx]);
  return { index: idx, clues: JSON.parse(q.clues_json), letters: normalizeAnswer(q.answer).length };
}

// Winners today (WIB) plus runs still inside their time window, so concurrent runs can't overshoot the quota.
function slotsLeft(now) {
  const { n } = db
    .prepare(
      `SELECT COUNT(*) AS n FROM rush_runs
       WHERE date(created_at, '+7 hours') = date('now', '+7 hours')
         AND (status = 'won' OR (status = 'active' AND started_ms > ?))`
    )
    .get(now - RUSH.totalMs - RUSH.graceMs);
  return Math.max(0, RUSH.dailyWinners - n);
}

router.get('/status', requireAuth, (req, res) => {
  const { prizeName, questions, totalMs, fastMs, dailyWinners } = RUSH;
  res.json({ prizeName, questions, totalMs, fastMs, dailyWinners, slotsLeft: slotsLeft(Date.now()) });
});

router.post('/start', requireAuth, (req, res) => {
  if (req.user.rush_meter < RUSH.meterMax) return res.status(400).json({ error: 'Tangki Rush belum penuh.' });
  const now = Date.now();
  if (!slotsLeft(now)) {
    return res.status(409).json({ error: 'Kuota pemenang Rush hari ini habis. Tangki lu tetap penuh — coba besok.' });
  }

  const ids = db
    .prepare('SELECT id, answer FROM questions ORDER BY RANDOM()')
    .all()
    .filter((q) => SHORT_ANSWER.test(normalizeAnswer(q.answer)))
    .slice(0, RUSH.questions)
    .map((q) => q.id);
  if (ids.length < RUSH.questions) {
    return res.status(503).json({
      error: `Bank soal Rush kurang: butuh ${RUSH.questions} soal berjawaban 1 kata maks ${RUSH.maxLetters} huruf.`,
    });
  }

  db.prepare("UPDATE rush_runs SET status = 'lost' WHERE user_id = ? AND status = 'active'").run(req.user.id);
  db.prepare('UPDATE users SET rush_meter = 0 WHERE id = ?').run(req.user.id);
  const info = db
    .prepare('INSERT INTO rush_runs (user_id, question_ids_json, started_ms, served_ms) VALUES (?, ?, ?, ?)')
    .run(req.user.id, JSON.stringify(ids), now, now);
  res.json({ runId: info.lastInsertRowid, question: questionPayload(ids, 0) });
});

router.post('/:id/answer', requireAuth, (req, res) => {
  const run = db.prepare('SELECT * FROM rush_runs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!run || run.status !== 'active') return res.status(400).json({ error: 'Rush ini sudah selesai.' });

  const now = Date.now();
  const ids = JSON.parse(run.question_ids_json);
  const q = db.prepare('SELECT answer FROM questions WHERE id = ?').get(ids[run.idx]);
  const lose = (reason) => {
    db.prepare("UPDATE rush_runs SET status = 'lost' WHERE id = ?").run(run.id);
    res.json({ status: 'lost', reason });
  };

  if (now - run.started_ms > RUSH.totalMs + RUSH.graceMs) return lose(`Waktu ${RUSH.totalMs / 1000} detik habis`);
  if (now - run.served_ms > RUSH.fastMs + RUSH.graceMs) return lose(`Lebih dari ${RUSH.fastMs / 1000} detik`);
  if (!q || normalizeAnswer(req.body?.answer) !== normalizeAnswer(q.answer)) return lose('Jawaban salah');

  const idx = run.idx + 1;
  if (idx < ids.length) {
    db.prepare('UPDATE rush_runs SET idx = ?, served_ms = ? WHERE id = ?').run(idx, now, run.id);
    return res.json({ status: 'next', question: questionPayload(ids, idx) });
  }

  db.prepare("UPDATE rush_runs SET status = 'won' WHERE id = ?").run(run.id);
  const claimUrl = createClaim(req.user.id, { name: `Rush · ${RUSH.prizeName}`, type: 'cash', amount: RUSH.prizeAmount });
  res.json({ status: 'won', prizeName: RUSH.prizeName, claimUrl });
});

export default router;
