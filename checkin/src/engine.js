import { db } from './db.js';
import { getConfig } from './cms.js';
import { DEFAULT_RULES, dayPoints, eventBonus, eventTag, levelAt, nextLevel, multiplier } from '../public/points.js';

// Indonesia has no DST, so WIB is a fixed UTC+7 offset. -aj
const WIB = 7 * 3600e3;
export const wibDay = (ms) => new Date(ms + WIB).toISOString().slice(0, 10);
export const wibHms = (ms) => new Date(ms + WIB).toISOString().slice(11, 19);
export const addDays = (day, n) => new Date(Date.parse(day) + n * 864e5).toISOString().slice(0, 10);
export const dayStartMs = (day) => Date.parse(day) - WIB;

export function getRules() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'rules'").get();
  return row ? { ...DEFAULT_RULES, ...JSON.parse(row.value) } : DEFAULT_RULES;
}
export function saveRules(r) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('rules', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(r));
}

// Leaderboards show "Dian A." to other customers; full names stay in the admin. -aj
export const maskName = (name) => {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  return w.length ? (w.length > 1 ? `${w[0]} ${w[w.length - 1][0]}.` : w[0]) : 'Pelanggan';
};

// Called on session exchange: name + segments come from the CBN backend, never from the browser. -aj
export function touchCustomer(id, name, segments, now) {
  db.prepare(
    `INSERT INTO customers (customer_id, name, segments, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(customer_id) DO UPDATE SET name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE name END, segments = excluded.segments`
  ).run(id, name || '', JSON.stringify(segments), now);
}

const getCustomer = (id) => db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(id);

// Events overlapping [from, to) that target this customer (no segments = everyone). -aj
function activeEvents(c, from, to = from + 1) {
  const mine = JSON.parse(c.segments);
  return db
    .prepare('SELECT * FROM events WHERE start_at < ? AND end_at > ? ORDER BY id')
    .all(to, from)
    .filter((ev) => { const s = JSON.parse(ev.segments); return !s.length || s.some((x) => mine.includes(x)); });
}

const countInEvent = (id, ev) =>
  db.prepare('SELECT COUNT(*) n FROM checkins WHERE customer_id = ? AND claimed_at >= ? AND claimed_at < ?').get(id, ev.start_at, ev.end_at).n;

function totals(id, now, r) {
  const since = new Date(now);
  since.setUTCMonth(since.getUTCMonth() - r.expiryMonths);
  return db
    .prepare('SELECT COALESCE(SUM(total), 0) lifetime, COALESCE(SUM(CASE WHEN claimed_at >= ? THEN total END), 0) balance FROM checkins WHERE customer_id = ?')
    .get(since.getTime(), id);
}

// Points for a claim made at `now` on streak day `s`. -aj
function quote(r, c, s, levelPct, paid, now) {
  const p = dayPoints(r, s, levelPct, paid);
  const hms = wibHms(now);
  const events = activeEvents(c, now).map((ev) => ({ id: ev.id, name: ev.name, bonus: eventBonus(ev, p, hms, countInEvent(c.customer_id, ev) + 1) }));
  const eventTotal = events.reduce((a, e) => a + e.bonus, 0);
  return { ...p, events, eventBonus: eventTotal, total: p.total + eventTotal };
}

export function claim(id, device, now) {
  const r = getRules();
  const today = wibDay(now);
  return db.transaction(() => {
    const c = getCustomer(id);
    if (c.last_day === today) return { already: true };
    const s = c.last_day === addDays(today, -1) ? c.streak + 1 : 1;
    const paid = JSON.parse(c.milestones);
    const q = quote(r, c, s, levelAt(r, totals(id, now, r).lifetime).pct, paid, now);
    db.prepare(
      `INSERT INTO checkins (customer_id, day, claimed_at, streak, multiplier, base, level_bonus, cycle_bonus, milestone_bonus, event_bonus, total, events, device)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, today, now, s, q.m, q.base, q.lb, q.cycle, q.milestone, q.eventBonus, q.total, JSON.stringify(q.events.filter((e) => e.bonus)), device);
    if (q.milestone) paid.push(s);
    db.prepare('UPDATE customers SET streak = ?, last_day = ?, last_claimed_at = ?, milestones = ? WHERE customer_id = ?').run(s, today, now, JSON.stringify(paid), id);
    return { already: false };
  })();
}

export const dismissPopup = (id, now) => db.prepare('UPDATE customers SET popup_dismissed_day = ? WHERE customer_id = ?').run(wibDay(now), id);

const rowQuote = (row) => ({
  m: row.multiplier, base: row.base, lb: row.level_bonus, cycle: row.cycle_bonus, milestone: row.milestone_bonus,
  events: JSON.parse(row.events), eventBonus: row.event_bonus, total: row.total,
});

function eventView(ev, id, claimedToday) {
  const v = { id: ev.id, name: ev.name, type: ev.type, value: ev.value, tag: eventTag(ev), endAt: ev.end_at, bannerUrl: ev.banner_url };
  if (ev.type === 'time_window') Object.assign(v, { windowStart: ev.window_start, windowEnd: ev.window_end });
  if (ev.type === 'challenge') Object.assign(v, { targetDays: ev.target_days, progress: Math.min(ev.target_days, countInEvent(id, ev)), claimedToday });
  return v;
}

export function state(id, now) {
  const r = getRules();
  const cfg = getConfig();
  const c = getCustomer(id);
  const today = wibDay(now);
  const claimed = c.last_day === today;
  const alive = claimed || c.last_day === addDays(today, -1);
  const streak = alive ? c.streak : 0; // current streak, 0 once broken -aj
  const todayS = claimed ? c.streak : streak + 1; // streak day of today's check-in -aj
  const paid = JSON.parse(c.milestones);
  const { lifetime, balance } = totals(id, now, r);
  const todayRow = claimed ? db.prepare('SELECT * FROM checkins WHERE customer_id = ? AND day = ?').get(id, today) : null;
  const lv = levelAt(r, lifetime - (todayRow?.total || 0));
  const q = claimed ? rowQuote(todayRow) : quote(r, c, todayS, lv.pct, paid, now);

  // 7-day cycle: H(todayS - cycleDay + 1) .. +6. Past days are done; future days show projected points. -aj
  const cycleDay = ((todayS - 1) % 7) + 1;
  const week = Array.from({ length: 7 }, (_, i) => {
    const s = todayS - cycleDay + i + 1;
    const day = addDays(today, s - todayS);
    const status = s < todayS || (s === todayS && claimed) ? 'done' : s === todayS ? 'today' : 'locked';
    const p = s === todayS ? q : dayPoints(r, s, lv.pct, paid);
    const evs = s === todayS ? activeEvents(c, now) : activeEvents(c, dayStartMs(day), dayStartMs(addDays(day, 1)));
    const ev = evs.find((e) => e.type !== 'challenge');
    const extra = s === todayS ? 0 : ev?.type === 'multiplier' ? Math.round((p.base + p.lb) * (ev.value - 1)) : 0;
    return { day: s, status, points: p.total + extra, bonus: p.cycle + p.milestone > 0, eventTag: ev ? eventTag(ev) : null };
  });

  let nb = todayS + (claimed ? 1 : 0);
  while (!(nb % 7 === 0 || (r.milestones[nb] && !paid.includes(nb)))) nb++;

  const month = today.slice(0, 7);
  const rank = db
    .prepare(
      `SELECT r, pts FROM (SELECT customer_id, SUM(total) pts, ROW_NUMBER() OVER (ORDER BY SUM(total) DESC, MAX(claimed_at)) r
       FROM checkins WHERE day >= ? AND day < ? GROUP BY customer_id) WHERE customer_id = ?`
    )
    .get(month + '-01', month + '-32', id);
  const cutoff = db
    .prepare('SELECT SUM(total) pts FROM checkins WHERE day >= ? AND day < ? GROUP BY customer_id ORDER BY pts DESC LIMIT 1 OFFSET ?')
    .get(month + '-01', month + '-32', r.board.size - 1);

  const ledger = db
    .prepare('SELECT day, claimed_at, streak, total, event_bonus, events FROM checkins WHERE customer_id = ? ORDER BY claimed_at DESC LIMIT 20')
    .all(id)
    .map((l) => ({ day: l.day, claimedAt: l.claimed_at, streak: l.streak, total: l.total, eventBonus: l.event_bonus, events: JSON.parse(l.events) }));

  const nx = nextLevel(r, lifetime);
  return {
    now,
    name: c.name,
    today,
    resetAt: dayStartMs(addDays(today, 1)),
    claimed,
    claimedAt: todayRow?.claimed_at ?? null,
    streak: claimed ? c.streak : streak,
    basePoints: r.base,
    multiplier: multiplier(r, claimed ? todayS : Math.max(1, streak)),
    showToast: cfg.enabled && cfg.popupEnabled && !claimed && c.popup_dismissed_day !== today,
    config: cfg,
    todayPoints: q,
    week,
    nextBonus: { day: nb, inDays: nb - todayS, points: week.find((w) => w.day === nb)?.points ?? dayPoints(r, nb, lv.pct, paid).total },
    balance,
    lifetime,
    level: { name: levelAt(r, lifetime).name, pct: levelAt(r, lifetime).pct, min: levelAt(r, lifetime).min, next: nx && { name: nx.name, min: nx.min } },
    events: activeEvents(c, now).map((ev) => eventView(ev, id, claimed)),
    rank: rank ? { position: rank.r, points: rank.pts } : null,
    boardSize: r.board.size,
    boardCutoff: cutoff?.pts ?? null,
    ledger,
  };
}

export function leaderboard(mode, id, now) {
  const r = getRules();
  const today = wibDay(now);
  const month = today.slice(0, 7);
  // Ties: whoever reached the value first (earlier last check-in, to the second) ranks higher. -aj
  const sql =
    mode === 'streak'
      ? `SELECT customer_id, name, streak val, last_claimed_at last, ROW_NUMBER() OVER (ORDER BY streak DESC, last_claimed_at) r
         FROM customers WHERE last_day >= ? AND streak > 0`
      : `SELECT c.customer_id, c.name, SUM(k.total) val, MAX(k.claimed_at) last, ROW_NUMBER() OVER (ORDER BY SUM(k.total) DESC, MAX(k.claimed_at)) r
         FROM checkins k JOIN customers c USING (customer_id) WHERE k.day >= ? AND k.day < ? GROUP BY c.customer_id`;
  const args = mode === 'streak' ? [addDays(today, -1)] : [month + '-01', month + '-32'];
  const view = (u) => u && { rank: u.r, name: maskName(u.name), value: u.val, lastAt: u.last };
  const top = db.prepare(`SELECT * FROM (${sql}) WHERE r <= ?`).all(...args, r.board.size).map(view);
  const me = db.prepare(`SELECT * FROM (${sql}) WHERE customer_id = ?`).get(...args, id);
  return { mode, month, top, me: view(me) };
}
