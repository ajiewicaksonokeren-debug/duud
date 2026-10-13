import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { getConfig, cmsStatus, sync, syncIfStale } from './cms.js';
import { claim, dismissPopup, getRules, leaderboard, saveRules, state, touchCustomer, wibDay, wibHms, addDays } from './engine.js';

const PROD = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (!PROD && 'dev-session-secret');
const adminToken = process.env.ADMIN_TOKEN || (!PROD && 'admin');
const exchangeUrl = process.env.CBN_EXCHANGE_URL;
if (!sessionSecret || !adminToken || (PROD && !exchangeUrl)) throw new Error('Set SESSION_SECRET, ADMIN_TOKEN and CBN_EXCHANGE_URL');
const COOKIE = 'cbn_checkin';
const SESSION_HOURS = 12;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
// WebView only ever loads our own pages; images may come from the Strapi media host.
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
// Refresh Strapi content in the background; requests never wait on Strapi.
app.use((req, res, next) => { syncIfStale(); next(); });

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => !!b && crypto.timingSafeEqual(sha(a), sha(b));
const cookie = (req, name) => (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='))?.slice(name.length + 1);

// One-time code from the CBN backend → customer. The user's real CBN login token never reaches the WebView.
async function exchange(code) {
  if (!exchangeUrl) {
    // Dev only: the code is base64url JSON minted by /dev/code.
    return JSON.parse(Buffer.from(code, 'base64url').toString());
  }
  const res = await fetch(exchangeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.CBN_EXCHANGE_TOKEN || ''}` },
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(5000),
  });
  if (res.status >= 400 && res.status < 500) return null;
  if (!res.ok) throw new HttpError(502, 'Server CBN tidak merespons. Coba lagi.');
  return res.json();
}

app.post('/api/session', async (req, res, next) => {
  try {
    const code = String(req.body?.code || '');
    const who = code && code.length <= 512 ? await exchange(code).catch((e) => { if (e.status) throw e; return null; }) : null;
    const id = String(who?.customer_id ?? '').slice(0, 40);
    if (!id) return res.status(401).json({ error: 'Kode sesi tidak valid atau kedaluwarsa.' });
    const segments = (Array.isArray(who.segments) ? who.segments : []).map((x) => String(x).trim().toLowerCase()).filter(Boolean).slice(0, 20);
    touchCustomer(id, String(who.name || '').slice(0, 80), segments, Date.now());
    const token = jwt.sign({ sub: id }, sessionSecret, { algorithm: 'HS256', expiresIn: SESSION_HOURS + 'h' });
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_HOURS * 3600}; HttpOnly; SameSite=Lax${PROD ? '; Secure' : ''}`);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

function customer(req, res, next) {
  try {
    req.cid = jwt.verify(cookie(req, COOKIE) || '', sessionSecret, { algorithms: ['HS256'] }).sub;
    if (!db.prepare('SELECT 1 FROM customers WHERE customer_id = ?').get(req.cid)) throw new Error('unknown customer');
    next();
  } catch {
    res.status(401).json({ error: 'Sesi berakhir.' });
  }
}

function admin(req, res, next) {
  if (same(bearer(req), adminToken)) return next();
  res.status(401).json({ error: 'Token admin salah.' });
}

// ---------- App (webview / native) ----------
const api = express.Router();
api.use(customer);
api.get('/state', (req, res) => res.json(state(req.cid, Date.now())));
api.post('/claim', (req, res) => {
  const now = Date.now();
  const device = ['android', 'ios', 'web'].includes(req.body?.device) ? req.body.device : '';
  if (!getConfig().enabled) throw new HttpError(403, 'Check-in sedang tidak aktif.');
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
    board: { size: num(b.board?.size, 3, 100, 'Jumlah peringkat') },
  };
}

const eventStatus = (e, now) => (now < e.start_at ? 'Terjadwal' : now >= e.end_at ? 'Selesai' : 'Aktif');
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
    events: db.prepare('SELECT * FROM events WHERE start_at <= ? AND end_at > ?').all(now, now),
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
  res.json({
    cms: cmsStatus(),
    config: getConfig(),
    events: db.prepare('SELECT * FROM events ORDER BY start_at DESC').all().map((e) => ({ ...e, segments: JSON.parse(e.segments), status: eventStatus(e, now), participants: part.get(e.start_at, e.end_at).n })),
  });
});
adm.post('/cms/sync', async (req, res) => {
  await sync();
  res.json(cmsStatus());
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

// Strapi → Settings → Webhooks: URL /hooks/strapi, header Authorization: Bearer <STRAPI_WEBHOOK_TOKEN>,
// events entry.publish / entry.unpublish / entry.update / entry.delete.
app.post('/hooks/strapi', async (req, res) => {
  if (!same(bearer(req), process.env.STRAPI_WEBHOOK_TOKEN)) return res.status(401).end();
  await sync();
  res.json({ ok: true });
});

// For the CBN backend's GET /home/checkin-card (server to server).
app.get('/api/internal/status/:customerId', (req, res) => {
  if (!same(bearer(req), process.env.INTERNAL_TOKEN)) return res.status(401).end();
  if (!db.prepare('SELECT 1 FROM customers WHERE customer_id = ?').get(req.params.customerId))
    return res.json({ claimed: false, streak: 0, enabled: getConfig().enabled });
  const s = state(req.params.customerId, Date.now());
  res.json({ enabled: s.config.enabled, showToast: s.showToast, claimed: s.claimed, claimedAt: s.claimedAt, streak: s.streak, todayPoints: s.todayPoints.total, events: s.events.map((e) => ({ name: e.name, tag: e.tag, endAt: e.endAt })) });
});

// Dev only: mint a one-time code like the CBN backend's POST /checkin/session would.
if (!exchangeUrl && !PROD) {
  app.post('/dev/code', (req, res) => {
    const who = { customer_id: str(req.body?.customer_id, 40, 'customer_id') || '30110910', name: str(req.body?.name, 80, 'name') || 'Dian Anggraeni', segments: req.body?.segments || [] };
    res.json({ code: Buffer.from(JSON.stringify(who)).toString('base64url') });
  });
}

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public'), { extensions: ['html'] }));

app.use((err, req, res, next) => {
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan server.' });
});

const port = Number(process.env.PORT) || 4100;
sync();
app.listen(port, () => console.log(`check-in service on :${port}${PROD ? '' : ' (dev: /demo, /admin — admin token "admin")'}`));
