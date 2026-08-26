import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { serializePack, serializeQuestion } from '../utils/serialize.js';
import { levelFromXp } from '../utils/leveling.js';

const router = Router();

// List all packs with lock state + progress summary for the current user.
router.get('/', requireAuth, (req, res) => {
  const packs = db.prepare('SELECT * FROM packs ORDER BY order_index ASC, id ASC').all();
  const playerLevel = levelFromXp(req.user.xp);

  const result = packs.map((p) => {
    const totalQuestions = db
      .prepare('SELECT COUNT(*) AS c FROM questions WHERE pack_id = ?')
      .get(p.id).c;
    const solvedCount = db
      .prepare(
        `SELECT COUNT(*) AS c FROM progress
         WHERE user_id = ? AND solved = 1 AND question_id IN (SELECT id FROM questions WHERE pack_id = ?)`
      )
      .get(req.user.id, p.id).c;

    return {
      ...serializePack(p),
      totalQuestions,
      solvedCount,
      locked: playerLevel < p.unlock_player_level,
    };
  });

  res.json({ packs: result });
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, category, unlockPlayerLevel, orderIndex } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nama pack wajib diisi.' });
  const info = db
    .prepare(
      'INSERT INTO packs (order_index, name, category, unlock_player_level) VALUES (?, ?, ?, ?)'
    )
    .run(orderIndex ?? 0, name, category || 'Level', unlockPlayerLevel ?? 1);
  const pack = db.prepare('SELECT * FROM packs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ pack: serializePack(pack) });
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const pack = db.prepare('SELECT * FROM packs WHERE id = ?').get(req.params.id);
  if (!pack) return res.status(404).json({ error: 'Pack tidak ditemukan.' });
  const { name, category, unlockPlayerLevel, orderIndex } = req.body || {};
  db.prepare(
    'UPDATE packs SET name = ?, category = ?, unlock_player_level = ?, order_index = ? WHERE id = ?'
  ).run(
    name ?? pack.name,
    category ?? pack.category,
    unlockPlayerLevel ?? pack.unlock_player_level,
    orderIndex ?? pack.order_index,
    pack.id
  );
  res.json({ pack: serializePack(db.prepare('SELECT * FROM packs WHERE id = ?').get(pack.id)) });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM packs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Questions within a pack (answer hidden unless already solved by user).
router.get('/:id/questions', requireAuth, (req, res) => {
  const pack = db.prepare('SELECT * FROM packs WHERE id = ?').get(req.params.id);
  if (!pack) return res.status(404).json({ error: 'Pack tidak ditemukan.' });

  const playerLevel = levelFromXp(req.user.xp);
  if (playerLevel < pack.unlock_player_level) {
    return res.status(403).json({ error: 'Level belum terbuka.' });
  }

  const questions = db
    .prepare('SELECT * FROM questions WHERE pack_id = ? ORDER BY order_index ASC, id ASC')
    .all(pack.id);

  const progressRows = db
    .prepare('SELECT * FROM progress WHERE user_id = ? AND question_id IN (SELECT id FROM questions WHERE pack_id = ?)')
    .all(req.user.id, pack.id);
  const progressByQ = Object.fromEntries(progressRows.map((r) => [r.question_id, r]));

  const result = questions.map((q) => {
    const prog = progressByQ[q.id];
    return {
      ...serializeQuestion(q, { includeAnswer: !!prog?.solved }),
      solved: !!prog?.solved,
      usedLetterHint: !!prog?.used_letter_hint,
      usedAnswerKey: !!prog?.used_answer_key,
    };
  });

  res.json({ pack: serializePack(pack), questions: result });
});

export default router;
