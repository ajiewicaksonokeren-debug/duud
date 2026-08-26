import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { serializeCategory, serializeQuestion } from '../utils/serialize.js';
import { levelFromXp } from '../utils/leveling.js';

const router = Router();

// List all categories with lock state + progress summary for the current user.
router.get('/', requireAuth, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY order_index ASC, id ASC').all();
  const playerLevel = levelFromXp(req.user.xp);

  const result = categories.map((c) => {
    const totalQuestions = db
      .prepare('SELECT COUNT(*) AS n FROM questions WHERE category_id = ?')
      .get(c.id).n;
    const solvedCount = db
      .prepare(
        `SELECT COUNT(*) AS n FROM progress
         WHERE user_id = ? AND solved = 1 AND question_id IN (SELECT id FROM questions WHERE category_id = ?)`
      )
      .get(req.user.id, c.id).n;

    return {
      ...serializeCategory(c),
      totalQuestions,
      solvedCount,
      locked: playerLevel < c.unlock_player_level,
    };
  });

  res.json({ categories: result });
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, icon, description, unlockPlayerLevel, orderIndex } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  const info = db
    .prepare(
      'INSERT INTO categories (order_index, name, icon, description, unlock_player_level) VALUES (?, ?, ?, ?, ?)'
    )
    .run(orderIndex ?? 0, name, icon || '🎮', description || '', unlockPlayerLevel ?? 1);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ category: serializeCategory(category) });
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
  const { name, icon, description, unlockPlayerLevel, orderIndex } = req.body || {};
  db.prepare(
    'UPDATE categories SET name = ?, icon = ?, description = ?, unlock_player_level = ?, order_index = ? WHERE id = ?'
  ).run(
    name ?? category.name,
    icon ?? category.icon,
    description ?? category.description,
    unlockPlayerLevel ?? category.unlock_player_level,
    orderIndex ?? category.order_index,
    category.id
  );
  res.json({
    category: serializeCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(category.id)),
  });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Questions ("levels") within a category (answer hidden unless already solved by user).
router.get('/:id/questions', requireAuth, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });

  const playerLevel = levelFromXp(req.user.xp);
  if (playerLevel < category.unlock_player_level) {
    return res.status(403).json({ error: 'Kategori belum terbuka.' });
  }

  const questions = db
    .prepare('SELECT * FROM questions WHERE category_id = ? ORDER BY level_number ASC, id ASC')
    .all(category.id);

  const progressRows = db
    .prepare(
      'SELECT * FROM progress WHERE user_id = ? AND question_id IN (SELECT id FROM questions WHERE category_id = ?)'
    )
    .all(req.user.id, category.id);
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

  res.json({ category: serializeCategory(category), questions: result });
});

export default router;
