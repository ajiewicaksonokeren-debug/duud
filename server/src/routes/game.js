import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeUser } from '../utils/serialize.js';
import { normalizeAnswer } from '../utils/normalize.js';

const router = Router();

const HINT_LETTER_COST = 15;
const HINT_ANSWER_COST = 40;

function getOrCreateProgress(userId, questionId) {
  let prog = db
    .prepare('SELECT * FROM progress WHERE user_id = ? AND question_id = ?')
    .get(userId, questionId);
  if (!prog) {
    db.prepare('INSERT INTO progress (user_id, question_id) VALUES (?, ?)').run(userId, questionId);
    prog = db.prepare('SELECT * FROM progress WHERE user_id = ? AND question_id = ?').get(userId, questionId);
  }
  return prog;
}

router.post('/questions/:id/answer', requireAuth, (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Soal tidak ditemukan.' });

  const prog = getOrCreateProgress(req.user.id, question.id);
  if (prog.solved) {
    return res.json({ correct: true, alreadySolved: true, user: serializeUser(req.user) });
  }

  const guess = normalizeAnswer(req.body?.answer);
  const correct = guess === normalizeAnswer(question.answer);

  if (!correct) {
    return res.json({ correct: false });
  }

  let coinsAwarded = question.reward_coins;
  let xpAwarded = question.reward_xp;
  if (prog.used_letter_hint) coinsAwarded = Math.max(1, Math.round(coinsAwarded * 0.7));
  if (prog.used_answer_key) {
    coinsAwarded = 0;
    xpAwarded = Math.max(1, Math.round(xpAwarded * 0.2));
  }
  const ticketsAwarded = 1;

  db.prepare("UPDATE progress SET solved = 1, solved_at = datetime('now') WHERE id = ?").run(prog.id);
  db.prepare('UPDATE users SET coins = coins + ?, xp = xp + ?, roulette_tickets = roulette_tickets + ? WHERE id = ?').run(
    coinsAwarded,
    xpAwarded,
    ticketsAwarded,
    req.user.id
  );

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    correct: true,
    coinsAwarded,
    xpAwarded,
    ticketsAwarded,
    answer: question.answer,
    user: serializeUser(updatedUser),
  });
});

router.post('/questions/:id/hint', requireAuth, (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Soal tidak ditemukan.' });

  const type = req.body?.type;
  const prog = getOrCreateProgress(req.user.id, question.id);
  if (prog.solved) return res.status(400).json({ error: 'Soal sudah terjawab.' });

  const cost = type === 'answer' ? HINT_ANSWER_COST : HINT_LETTER_COST;
  if (type === 'letter' && prog.used_letter_hint) {
    return res.status(400).json({ error: 'Bantuan huruf sudah dipakai untuk soal ini.' });
  }
  if (req.user.coins < cost) {
    return res.status(400).json({ error: 'Koin tidak cukup.' });
  }

  db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(cost, req.user.id);

  if (type === 'answer') {
    db.prepare('UPDATE progress SET used_answer_key = 1 WHERE id = ?').run(prog.id);
  } else {
    db.prepare('UPDATE progress SET used_letter_hint = 1 WHERE id = ?').run(prog.id);
  }

  const answer = question.answer;
  let payload = {};
  if (type === 'answer') {
    payload = { answer };
  } else {
    const revealedCount = Math.max(1, Math.floor(answer.replace(/\s/g, '').length * 0.3));
    const mask = answer
      .split('')
      .map((ch, i) => (ch === ' ' ? ' ' : i < revealedCount ? ch : '_'))
      .join('');
    payload = { maskedAnswer: mask };
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ ...payload, cost, user: serializeUser(updatedUser) });
});

export default router;
