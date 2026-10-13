import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { claim, dismissPopup, getRules, leaderboard, saveRules, state, touchCustomer, wibDay, wibHms, addDays } from './engine.js';

const PROD = process.env.NODE_ENV === 'production';
const publicKey = process.env.CBN_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
const jwtKey = publicKey || process.env.CBN_JWT_SECRET || (!PROD && 'dev-secret');
const adminToken = process.env.ADMIN_TOKEN || (!PROD && 'admin');
if (!jwtKey || !adminToken) throw new Error('Set CBN_JWT_SECRET or CBN_JWT_PUBLIC_KEY, and ADMIN_TOKEN');
const jwtOpts = { algorithms: publicKey ? ['RS256', 'ES256'] : ['HS256'], ...(process.env.CBN_JWT_ISSUER && { issuer: process.env.CBN_JWT_ISSUER }) };
const idClaim = process.env.CBN_CUSTOMER_CLAIM || 'customer_id';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

// customer_id always comes from the verified CBN session token, never from the request body.
function customer(req, res, next) {
  try {
    const p = jwt.verify(bearer(req), jwtKey, jwtOpts);
    const id = String(p[idClaim] ?? p.sub ?? '');
    if (!id) throw new Error('no customer id');
    req.cid = id;
    touchCustomer(id, String(p.name || '').slice(0, 80), Date.now());
    next();
  } catch {
    res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang.' });
  }
}

const sha = (s) => crypto.createHash('sha256').update(s).digest();
function admin(req, res, next) {
  if (crypto.timingSafeEqual(sha(bearer(req)), sha(adminToken))) return next();
  res.status(401).json({ error: 'Token admin salah.' });
}

// ---------- App (webview / native) ----------
const api = express.Router();
api.use(customer);
api.get('/state', (req, res) => res.json(state(req.cid, Date.now())));
api.post('/claim', (req, res) => {
  const now = Date.now();
  const device = ['android', 'ios', 'web'].includes(req.body?.device) ? req.body.device : '';
  const { already } = claim(req.cid, device, now);
  res.status(already ? 409 : 200).json({ already, state: state(req.cid, now) });
});
api.post('/dismiss', (req, res) => {
  dismissPopup(req.cid, Date.now());
  res.json({ ok: true });
});
api.get('/leaderboard', (req, res) => res.json(leaderboard(req.query.mode === 'streak' ? 'streak' : 'points', req.cid, Date.now())));
app.use('/api/checkin', api);

// ---------- Admin ----------
const num = (v, min, max, label, int = true) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new HttpError(400, `${label} harus ${min}–${max}`);
  return n;
};
const str = (v, max, label) => {
  const s = String(v ?? '').trim();
  if (s.length > max) throw new HttpError(400, `${label} maks. ${max} karakter`);
  return s;
};
const url = (v, label) => {
  const s = str(v, 500, label);
  if (s && !/^(https:\/\/|\/)[^\s"'()<>]*$/.test(s)) throw new HttpError(400, `${label} harus URL https:// atau path /`);
  return s;
};
const HMS = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

function parseRules(b) {
  const tiers = (b.tiers || []).map((t, i) => ({ from: num(t.from, 1, 3650, `Multiplier baris ${i + 1}: hari`), m: num(t.m, 1, 5, `Multiplier baris ${i + 1}`, false) }));
  tiers.sort((a, b) => a.from - b.from);
  if (tiers[0]?.from !== 1) throw new HttpError(400, 'Multiplier harus mulai dari hari 1');
  const milestones = {};
  for (const [d, p] of Object.entries(b.milestones || {})) milestones[num(d, 1, 3650, 'Hari milestone')] = num(p, 0, 1e6, 'Poin milestone');
  const levels = (b.levels || []).map((l, i) => ({ name: str(l.name, 20, `Nama level ${i + 1}`) || `Level ${i + 1}`, min: num(l.min, 0, 1e9, `Batas level ${i + 1}`), pct: num(l.pct, 0, 100, `Bonus level ${i + 1}`) }));
  levels.sort((a, b) => a.min - b.min);
  if (levels[0]?.min !== 0) throw new HttpError(400, 'Level pertama harus mulai dari 0 poin');
  return {
    base: num(b.base, 1, 10000, 'Poin dasar'),
    cycle: num(b.cycle, 0, 100000, 'Bonus hari ke-7'),
    expiryMonths: num(b.expiryMonths, 1, 120, 'Masa berlaku'),
    tiers,
    milestones,
    levels,
    popup: {
      enabled: !!b.popup?.enabled,
      title: str(b.popup?.title, 40, 'Judul pop-up') || 'Check-in Harian',
      button: str(b.popup?.button, 24, 'Label tombol') || 'Klaim Poin',
      heroUrl: url(b.popup?.heroUrl, 'Gambar pop-up'),
      successUrl: url(b.popup?.successUrl, 'Gambar sukses'),
    },
    board: { size: num(b.board?.size, 3, 100, 'Jumlah peringkat') },
  };
}

function parseEvent(b, selfId) {
  const type = b.type;
  if (!['multiplier', 'time_window', 'challenge'].includes(type)) throw new HttpError(400, 'Tipe event tidak dikenal');
  const ev = {
    name: str(b.name, 28, 'Nama event'),
    type,
    value: type === 'multiplier' ? num(b.value, 1.1, 3, 'Multiplier event', false) : num(b.value, 1, 100000, 'Bonus event'),
    start_at: num(b.start_at, 0, 8.64e15, 'Mulai'),
    end_at: num(b.end_at, 0, 8.64e15, 'Selesai'),
    window_start: type === 'time_window' ? b.window_start : null,
    window_end: type === 'time_window' ? b.window_end : null,
    target_days: type === 'challenge' ? num(b.target_days, 1, 365, 'Target hari') : null,
    banner_url: url(b.banner_url, 'Banner'),
    draft: b.draft ? 1 : 0,
  };
  if (!ev.name) throw new HttpError(400, 'Nama event wajib diisi');
  if (ev.end_at <= ev.start_at) throw new HttpError(400, 'Selesai harus setelah mulai');
  if (type === 'time_window' && !(HMS.test(ev.window_start) && HMS.test(ev.window_end) && ev.window_start < ev.window_end))
    throw new HttpError(400, 'Jam berlaku harus HH:MM:SS dan mulai < selesai');
  if (!ev.draft) {
    const clash = db
      .prepare('SELECT name FROM events WHERE draft = 0 AND type = ? AND id <> ? AND start_at < ? AND end_at > ?')
      .get(type, selfId ?? -1, ev.end_at, ev.start_at);
    if (clash) throw new HttpError(409, `Bentrok dengan "${clash.name}" — maks. 1 event per tipe berjalan bersamaan`);
  }
  return ev;
}

const eventStatus = (e, now) => (e.draft ? 'Draft' : now < e.start_at ? 'Terjadwal' : now >= e.end_at ? 'Selesai' : 'Aktif');
const logRow = (l) => ({ ...l, events: JSON.parse(l.events) });

const adm = express.Router();
adm.use(admin);
adm.get('/dashboard', (req, res) => {
  const now = Date.now();
  const today = wibDay(now);
  const yday = addDays(today, -1);
  const agg = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(total), 0) pts, COALESCE(AVG(streak), 0) avg FROM checkins WHERE day = ?');
  const t = agg.get(today);
  const y = agg.get(yday);
  const hourly = Array(24).fill(0);
  for (const h of db.prepare('SELECT ((claimed_at / 1000 + 25200) % 86400) / 3600 h, COUNT(*) n FROM checkins WHERE day = ? GROUP BY h').all(today)) hourly[h.h] = h.n;
  res.json({
    now,
    today: { checkins: t.n, points: t.pts, avgStreak: Math.round(t.avg * 10) / 10 },
    yesterday: { checkins: y.n, points: y.pts },
    customers: db.prepare('SELECT COUNT(*) n FROM customers').get().n,
    activeStreaks: db.prepare('SELECT COUNT(*) n FROM customers WHERE last_day >= ? AND streak > 0').get(yday).n,
    hourly,
    events: db.prepare('SELECT * FROM events WHERE draft = 0 AND start_at <= ? AND end_at > ?').all(now, now),
    recent: db.prepare('SELECT k.*, c.name FROM checkins k JOIN customers c USING (customer_id) ORDER BY k.claimed_at DESC LIMIT 10').all().map(logRow),
  });
});
adm.get('/rules', (req, res) => res.json(getRules()));
adm.put('/rules', (req, res) => {
  const r = parseRules(req.body || {});
  saveRules(r);
  res.json(r);
});
adm.get('/events', (req, res) => {
  const now = Date.now();
  const part = db.prepare('SELECT COUNT(DISTINCT customer_id) n FROM checkins WHERE claimed_at >= ? AND claimed_at < ?');
  res.json(
    db.prepare('SELECT * FROM events ORDER BY start_at DESC').all().map((e) => ({ ...e, status: eventStatus(e, now), participants: e.draft ? 0 : part.get(e.start_at, e.end_at).n }))
  );
});
adm.post('/events', (req, res) => {
  const e = parseEvent(req.body || {});
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO events (name, type, value, start_at, end_at, window_start, window_end, target_days, banner_url, draft, created_at)
       VALUES (@name, @type, @value, @start_at, @end_at, @window_start, @window_end, @target_days, @banner_url, @draft, @created_at)`
    )
    .run({ ...e, created_at: Date.now() });
  res.status(201).json({ id: lastInsertRowid });
});
adm.put('/events/:id', (req, res) => {
  const id = Number(req.params.id);
  const e = parseEvent(req.body || {}, id);
  const { changes } = db
    .prepare(
      `UPDATE events SET name=@name, type=@type, value=@value, start_at=@start_at, end_at=@end_at, window_start=@window_start,
       window_end=@window_end, target_days=@target_days, banner_url=@banner_url, draft=@draft WHERE id=@id`
    )
    .run({ ...e, id });
  if (!changes) throw new HttpError(404, 'Event tidak ditemukan');
  res.json({ ok: true });
});
adm.delete('/events/:id', (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

const logQuery = (from, to, q, limit) =>
  db
    .prepare(
      `SELECT k.*, c.name FROM checkins k JOIN customers c USING (customer_id)
       WHERE k.day >= ? AND k.day <= ? AND (? = '' OR k.customer_id = ? OR c.name LIKE ?) ORDER BY k.claimed_at DESC LIMIT ?`
    )
    .all(from, to, q, q, `%${q}%`, limit)
    .map(logRow);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const range = (req) => {
  const today = wibDay(Date.now());
  const from = DAY.test(req.query.from) ? req.query.from : today;
  const to = DAY.test(req.query.to) ? req.query.to : from;
  return [from, to, String(req.query.q || '').trim().slice(0, 60)];
};
adm.get('/logs', (req, res) => res.json(logQuery(...range(req), 500)));
adm.get('/logs.csv', (req, res) => {
  const [from, to, q] = range(req);
  // Prefix formula-like cells so Excel doesn't execute them (CSV injection).
  const cell = (v) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const head = ['waktu_wib', 'customer_id', 'nama', 'streak', 'multiplier', 'base', 'bonus_level', 'bonus_hari7', 'milestone', 'bonus_event', 'total', 'event', 'perangkat'];
  const lines = logQuery(from, to, q, 1e6).map((l) =>
    [`${l.day} ${wibHms(l.claimed_at)}`, l.customer_id, l.name, l.streak, l.multiplier, l.base, l.level_bonus, l.cycle_bonus, l.milestone_bonus, l.event_bonus, l.total, l.events.map((e) => e.name).join('; '), l.device]
      .map(cell)
      .join(',')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="checkin-${from}_${to}.csv"`);
  res.send('﻿' + [head.join(','), ...lines].join('\r\n'));
});
app.use('/api/admin', adm);

// Dev only: mint a CBN-like session token so the webview can be tried without the real CBN auth.
if (!PROD && !publicKey) {
  app.post('/dev/token', (req, res) => {
    const id = str(req.body?.customer_id, 40, 'customer_id') || '30110910';
    res.json({ token: jwt.sign({ [idClaim]: id, name: str(req.body?.name, 80, 'name') || 'Dian Anggraeni' }, jwtKey, { expiresIn: '7d' }) });
  });
}

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public'), { extensions: ['html'] }));

app.use((err, req, res, next) => {
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan server.' });
});

const port = Number(process.env.PORT) || 4100;
app.listen(port, () => console.log(`check-in service on :${port}${PROD ? '' : ' (dev: /demo, /admin — admin token "admin")'}`));
