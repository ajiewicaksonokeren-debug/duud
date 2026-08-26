import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { serializeQuestion } from '../utils/serialize.js';

const router = Router();

function validateClues(clues) {
  return (
    Array.isArray(clues) &&
    clues.length > 0 &&
    clues.every(
      (c) => c && typeof c.value === 'string' && ['emoji', 'text', 'image'].includes(c.type)
    )
  );
}

// Admin: create a question directly inside a pack.
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { packId, clues, answer, difficulty, rewardCoins, rewardXp, orderIndex } = req.body || {};
  const pack = db.prepare('SELECT * FROM packs WHERE id = ?').get(packId);
  if (!pack) return res.status(400).json({ error: 'Pack tidak valid.' });
  if (!validateClues(clues)) return res.status(400).json({ error: 'Clue tidak valid.' });
  if (!answer || !answer.trim()) return res.status(400).json({ error: 'Jawaban wajib diisi.' });

  const info = db
    .prepare(
      `INSERT INTO questions (pack_id, order_index, clues_json, answer, difficulty, reward_coins, reward_xp, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      pack.id,
      orderIndex ?? 0,
      JSON.stringify(clues),
      answer.trim().toUpperCase(),
      difficulty ?? 1,
      rewardCoins ?? 10,
      rewardXp ?? 10,
      req.user.id
    );

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ question: serializeQuestion(question, { includeAnswer: true }) });
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Soal tidak ditemukan.' });

  const { clues, answer, difficulty, rewardCoins, rewardXp, orderIndex, packId } = req.body || {};
  if (clues && !validateClues(clues)) return res.status(400).json({ error: 'Clue tidak valid.' });

  db.prepare(
    `UPDATE questions SET pack_id = ?, order_index = ?, clues_json = ?, answer = ?, difficulty = ?, reward_coins = ?, reward_xp = ?
     WHERE id = ?`
  ).run(
    packId ?? question.pack_id,
    orderIndex ?? question.order_index,
    clues ? JSON.stringify(clues) : question.clues_json,
    answer ? answer.trim().toUpperCase() : question.answer,
    difficulty ?? question.difficulty,
    rewardCoins ?? question.reward_coins,
    rewardXp ?? question.reward_xp,
    question.id
  );

  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(question.id);
  res.json({ question: serializeQuestion(updated, { includeAnswer: true }) });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin view: list all questions across all packs with answers visible.
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const questions = db.prepare('SELECT * FROM questions ORDER BY pack_id ASC, order_index ASC').all();
  res.json({ questions: questions.map((q) => serializeQuestion(q, { includeAnswer: true })) });
});

// Player-submitted questions ("Kirim Soal").
router.post('/submit', requireAuth, (req, res) => {
  const { clues, answer } = req.body || {};
  if (!validateClues(clues)) return res.status(400).json({ error: 'Clue tidak valid.' });
  if (!answer || !answer.trim()) return res.status(400).json({ error: 'Jawaban wajib diisi.' });

  db.prepare(
    'INSERT INTO submitted_questions (user_id, clues_json, answer) VALUES (?, ?, ?)'
  ).run(req.user.id, JSON.stringify(clues), answer.trim().toUpperCase());

  res.status(201).json({ ok: true, message: 'Soal kamu sudah dikirim untuk ditinjau. Terima kasih!' });
});

router.get('/submitted', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare('SELECT sq.*, u.username FROM submitted_questions sq JOIN users u ON u.id = sq.user_id ORDER BY sq.created_at DESC')
    .all();
  res.json({
    submitted: rows.map((r) => ({
      id: r.id,
      username: r.username,
      clues: JSON.parse(r.clues_json),
      answer: r.answer,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
});

// Approve a submitted question into a pack, or reject it.
router.post('/submitted/:id/review', requireAuth, requireAdmin, (req, res) => {
  const submitted = db.prepare('SELECT * FROM submitted_questions WHERE id = ?').get(req.params.id);
  if (!submitted) return res.status(404).json({ error: 'Tidak ditemukan.' });
  const { action, packId } = req.body || {};

  if (action === 'approve') {
    const pack = db.prepare('SELECT * FROM packs WHERE id = ?').get(packId);
    if (!pack) return res.status(400).json({ error: 'Pack tujuan tidak valid.' });
    db.prepare(
      `INSERT INTO questions (pack_id, order_index, clues_json, answer, difficulty, reward_coins, reward_xp, created_by)
       VALUES (?, 0, ?, ?, 1, 15, 15, ?)`
    ).run(pack.id, submitted.clues_json, submitted.answer, submitted.user_id);
    db.prepare("UPDATE submitted_questions SET status = 'approved' WHERE id = ?").run(submitted.id);
    db.prepare('UPDATE users SET coins = coins + 25 WHERE id = ?').run(submitted.user_id);
  } else {
    db.prepare("UPDATE submitted_questions SET status = 'rejected' WHERE id = ?").run(submitted.id);
  }

  res.json({ ok: true });
});

export default router;
