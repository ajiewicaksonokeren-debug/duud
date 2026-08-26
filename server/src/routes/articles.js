import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { serializeUser, serializeArticle } from '../utils/serialize.js';
import { hashIp, rateLimit } from '../utils/antiCheat.js';

const router = Router();

// A malicious client could otherwise hammer /start or /complete to brute-force
// the quiz answer or probe the timer check.
const readLimiter = rateLimit({ windowMs: 60_000, max: 20, keyFn: (req) => `article:${req.user.id}` });

function estimateReadSeconds(content) {
  const words = String(content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.min(240, Math.max(20, Math.round((words / 200) * 60)));
}

function getReadState(userId, articleId) {
  const row = db.prepare('SELECT * FROM article_reads WHERE user_id = ? AND article_id = ?').get(userId, articleId);
  if (!row) return 'not_started';
  return row.status;
}

router.get('/', requireAuth, (req, res) => {
  const articles = db.prepare('SELECT * FROM articles WHERE published = 1 ORDER BY created_at DESC').all();
  res.json({
    articles: articles.map((a) => serializeArticle(a, { readState: getReadState(req.user.id, a.id) })),
  });
});

router.get('/:id', requireAuth, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article || (!article.published && !req.user.is_admin)) {
    return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
  }
  res.json({ article: serializeArticle(article, { readState: getReadState(req.user.id, article.id) }) });
});

// Starts (or resumes) the server-timed reading session for this article.
router.post('/:id/start', requireAuth, readLimiter, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ? AND published = 1').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Artikel tidak ditemukan.' });

  const existing = db.prepare('SELECT * FROM article_reads WHERE user_id = ? AND article_id = ?').get(req.user.id, article.id);
  if (existing?.status === 'completed') {
    return res.json({ alreadyCompleted: true, minReadSeconds: article.min_read_seconds });
  }

  const sessionToken = crypto.randomBytes(16).toString('hex');
  const ipHash = hashIp(req);
  if (existing) {
    db.prepare("UPDATE article_reads SET session_token = ?, started_at = datetime('now'), ip_hash = ? WHERE id = ?").run(
      sessionToken,
      ipHash,
      existing.id
    );
  } else {
    db.prepare('INSERT INTO article_reads (user_id, article_id, session_token, ip_hash) VALUES (?, ?, ?, ?)').run(
      req.user.id,
      article.id,
      sessionToken,
      ipHash
    );
  }

  res.json({
    alreadyCompleted: false,
    sessionToken,
    minReadSeconds: article.min_read_seconds,
    hasQuiz: !!article.quiz_question,
    quizQuestion: article.quiz_question || null,
    quizChoices: article.quiz_choices_json ? JSON.parse(article.quiz_choices_json) : null,
  });
});

// Grants the reward -- but only if the server's own clock confirms enough
// time passed since /start, and (if configured) the quiz was answered right.
// The client-reported elapsed time is never trusted.
router.post('/:id/complete', requireAuth, readLimiter, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ? AND published = 1').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Artikel tidak ditemukan.' });

  const read = db.prepare('SELECT * FROM article_reads WHERE user_id = ? AND article_id = ?').get(req.user.id, article.id);
  if (!read) return res.status(400).json({ error: 'Mulai membaca dulu sebelum klaim reward.' });
  if (read.status === 'completed') return res.status(400).json({ error: 'Reward artikel ini sudah pernah kamu klaim.' });
  if (!req.body?.sessionToken || req.body.sessionToken !== read.session_token) {
    return res.status(400).json({ error: 'Sesi membaca tidak valid, buka ulang artikelnya.' });
  }

  const elapsedMs = Date.now() - new Date(`${read.started_at.replace(' ', 'T')}Z`).getTime();
  if (elapsedMs < article.min_read_seconds * 1000) {
    return res.status(400).json({ error: 'Waktu membaca belum cukup, baca dulu sampai selesai ya.' });
  }

  if (article.quiz_question) {
    const answerIndex = req.body?.quizAnswerIndex;
    if (typeof answerIndex !== 'number' || answerIndex !== article.quiz_correct_index) {
      return res.status(400).json({ error: 'Jawaban kuis kurang tepat, coba baca lagi & jawab ulang.' });
    }
  }

  const grant = db.transaction(() => {
    db.prepare("UPDATE article_reads SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(read.id);
    db.prepare('UPDATE users SET coins = coins + ?, xp = xp + ?, roulette_tickets = roulette_tickets + ? WHERE id = ?').run(
      article.reward_coins,
      article.reward_xp,
      article.reward_tickets,
      req.user.id
    );
  });
  grant();

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    ok: true,
    ticketsAwarded: article.reward_tickets,
    coinsAwarded: article.reward_coins,
    xpAwarded: article.reward_xp,
    user: serializeUser(updatedUser),
  });
});

// --- Admin: manage articles ---

router.get('/admin/list', requireAuth, requireAdmin, (req, res) => {
  const articles = db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all();
  res.json({ articles: articles.map((a) => serializeArticle(a, { includeQuizAnswer: true })) });
});

router.post('/admin/list', requireAuth, requireAdmin, (req, res) => {
  const { title, coverImage, excerpt, content, category, rewardTickets, rewardCoins, rewardXp, quiz, published } =
    req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Judul dan isi artikel wajib diisi.' });

  const minReadSeconds = estimateReadSeconds(content);
  const info = db
    .prepare(
      `INSERT INTO articles (title, cover_image, excerpt, content, category, min_read_seconds, reward_tickets, reward_coins, reward_xp, quiz_question, quiz_choices_json, quiz_correct_index, published, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title,
      coverImage || '',
      excerpt || '',
      content,
      category || 'Umum',
      minReadSeconds,
      rewardTickets ?? 1,
      rewardCoins ?? 15,
      rewardXp ?? 15,
      quiz?.question || null,
      quiz?.choices ? JSON.stringify(quiz.choices) : null,
      quiz?.question ? quiz.correctIndex ?? 0 : null,
      published === false ? 0 : 1,
      req.user.id
    );
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ article: serializeArticle(article, { includeQuizAnswer: true }) });
});

router.put('/admin/list/:id', requireAuth, requireAdmin, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
  const { title, coverImage, excerpt, content, category, rewardTickets, rewardCoins, rewardXp, quiz, published } =
    req.body || {};
  const newContent = content ?? article.content;
  db.prepare(
    `UPDATE articles SET title = ?, cover_image = ?, excerpt = ?, content = ?, category = ?, min_read_seconds = ?,
      reward_tickets = ?, reward_coins = ?, reward_xp = ?, quiz_question = ?, quiz_choices_json = ?, quiz_correct_index = ?, published = ?
     WHERE id = ?`
  ).run(
    title ?? article.title,
    coverImage ?? article.cover_image,
    excerpt ?? article.excerpt,
    newContent,
    category ?? article.category,
    content ? estimateReadSeconds(newContent) : article.min_read_seconds,
    rewardTickets ?? article.reward_tickets,
    rewardCoins ?? article.reward_coins,
    rewardXp ?? article.reward_xp,
    quiz?.question !== undefined ? quiz.question || null : article.quiz_question,
    quiz?.choices !== undefined ? (quiz.choices ? JSON.stringify(quiz.choices) : null) : article.quiz_choices_json,
    quiz?.correctIndex !== undefined ? quiz.correctIndex : article.quiz_correct_index,
    published === undefined ? article.published : published ? 1 : 0,
    article.id
  );
  res.json({ article: serializeArticle(db.prepare('SELECT * FROM articles WHERE id = ?').get(article.id), { includeQuizAnswer: true }) });
});

router.delete('/admin/list/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Reads flagged for unusual patterns (e.g. many accounts finishing the same
// article from one IP in a short window) -- surfaced for manual review, not
// auto-blocked, since shared networks (campus/office wifi) look the same.
router.get('/admin/flagged', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ar.*, u.username, a.title FROM article_reads ar
       JOIN users u ON u.id = ar.user_id
       JOIN articles a ON a.id = ar.article_id
       WHERE ar.status = 'completed'
       ORDER BY ar.completed_at DESC LIMIT 300`
    )
    .all();

  const byIpArticle = new Map();
  rows.forEach((r) => {
    const key = `${r.ip_hash}:${r.article_id}`;
    if (!byIpArticle.has(key)) byIpArticle.set(key, new Set());
    byIpArticle.get(key).add(r.user_id);
  });

  const flagged = rows
    .filter((r) => byIpArticle.get(`${r.ip_hash}:${r.article_id}`).size >= 3)
    .map((r) => ({
      id: r.id,
      username: r.username,
      articleTitle: r.title,
      completedAt: r.completed_at,
      ipHash: r.ip_hash,
      accountsSharingIp: byIpArticle.get(`${r.ip_hash}:${r.article_id}`).size,
    }));

  res.json({ flagged });
});

export default router;
