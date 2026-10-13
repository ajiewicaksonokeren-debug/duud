import { db } from './db.js';

// Strapi owns content (feature switch, texts, images, events). Points and login stay here.
// Published entries are mirrored into SQLite so claims never wait on Strapi and survive a Strapi outage.
const STRAPI_URL = (process.env.STRAPI_URL || '').replace(/\/$/, '');
const TTL = 5 * 60e3;

export const DEFAULT_CONFIG = { enabled: true, popupEnabled: true, title: 'Check-in Harian', popupImage: '', successImage: '' };

let syncedAt = 0;
let nextSync = 0;
let lastError = null;
let warnings = [];

const setting = (key) => JSON.parse(db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? 'null');
const saveSetting = (key, v) =>
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(v));

export const getConfig = () => ({ ...DEFAULT_CONFIG, ...setting('cms_config') });
export const cmsStatus = () => ({ source: STRAPI_URL || null, syncedAt: syncedAt || null, error: lastError, warnings });

// Strapi v5 returns flat entries, v4 nests them under `attributes`; media likewise.
const flat = (e) => (e ? { id: e.id, ...(e.attributes ?? e) } : null);
const media = (m) => {
  const url = m?.url ?? m?.data?.attributes?.url ?? m?.data?.url ?? '';
  return url && !/^https?:\/\//.test(url) ? STRAPI_URL + url : url;
};
const hms = (t) => (/^\d{2}:\d{2}(:\d{2})?/.test(t || '') ? t.slice(0, 8).padEnd(8, ':00') : null);

async function get(path) {
  const res = await fetch(STRAPI_URL + path, {
    headers: process.env.STRAPI_TOKEN ? { authorization: `Bearer ${process.env.STRAPI_TOKEN}` } : {},
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 404) return { data: null }; // single type not created/published yet
  if (!res.ok) throw new Error(`Strapi ${path.split('?')[0]} → HTTP ${res.status}`);
  return res.json();
}

function toEvent(e) {
  const type = e.type;
  const ev = {
    id: e.id,
    name: String(e.name || '').slice(0, 28),
    type,
    value: Number(e.value),
    start_at: Date.parse(e.start_at),
    end_at: Date.parse(e.end_at),
    window_start: type === 'time_window' ? hms(e.window_start) : null,
    window_end: type === 'time_window' ? hms(e.window_end) : null,
    target_days: type === 'challenge' ? Math.trunc(Number(e.target_days)) : null,
    segments: JSON.stringify((Array.isArray(e.segments) ? e.segments : String(e.segments || '').split(',')).map((s) => String(s).trim().toLowerCase()).filter(Boolean)),
    banner_url: media(e.banner),
  };
  const bad =
    !ev.name ? 'nama kosong'
    : !['multiplier', 'time_window', 'challenge'].includes(type) ? `tipe "${type}" tidak dikenal`
    : !(ev.end_at > ev.start_at) ? 'selesai harus setelah mulai'
    : type === 'multiplier' && !(ev.value > 1 && ev.value <= 3) ? 'multiplier harus >1 dan ≤3'
    : type !== 'multiplier' && !(Number.isInteger(ev.value) && ev.value > 0) ? 'nilai harus bilangan bulat > 0'
    : type === 'time_window' && !(ev.window_start && ev.window_end && ev.window_start < ev.window_end) ? 'jam berlaku tidak valid'
    : type === 'challenge' && !(ev.target_days >= 1) ? 'target hari tidak valid'
    : null;
  return { ev, bad };
}

export async function sync() {
  if (!STRAPI_URL) return;
  try {
    const cfg = flat((await get('/api/checkin-config?populate=*')).data);
    const items = [];
    for (let page = 1, pages = 1; page <= pages && page <= 10; page++) {
      const body = await get(`/api/checkin-events?populate=*&filters[end_at][$gt]=${new Date(Date.now() - 400 * 864e5).toISOString()}&pagination[page]=${page}&pagination[pageSize]=100`);
      items.push(...body.data.map(flat));
      pages = body.meta?.pagination?.pageCount ?? 1;
    }
    // Max 1 event per type at a time: the earlier start wins, the clash is reported in the admin.
    const w = [];
    const kept = [];
    for (const { ev, bad } of items.map(toEvent).sort((a, b) => a.ev.start_at - b.ev.start_at)) {
      const clash = kept.find((k) => k.type === ev.type && k.start_at < ev.end_at && k.end_at > ev.start_at);
      if (bad || clash) w.push(`Event "${ev.name || ev.id}" diabaikan: ${bad || `bentrok dengan "${clash.name}"`}`);
      else kept.push(ev);
    }
    db.transaction(() => {
      saveSetting('cms_config', cfg
        ? { enabled: cfg.enabled !== false, popupEnabled: cfg.popup_enabled !== false, title: cfg.entry_title || DEFAULT_CONFIG.title, popupImage: media(cfg.popup_image), successImage: media(cfg.success_image) }
        : { enabled: false });
      db.prepare('DELETE FROM events').run();
      const ins = db.prepare(
        `INSERT INTO events (id, name, type, value, start_at, end_at, window_start, window_end, target_days, segments, banner_url)
         VALUES (@id, @name, @type, @value, @start_at, @end_at, @window_start, @window_end, @target_days, @segments, @banner_url)`
      );
      kept.forEach((e) => ins.run(e));
    })();
    warnings = w;
    lastError = null;
    syncedAt = Date.now();
    nextSync = syncedAt + TTL;
  } catch (e) {
    lastError = e.message; // keep serving the last good mirror, retry in 30 s
    nextSync = Date.now() + 30e3;
    console.error('Strapi sync failed:', e.message);
  }
}

let inflight = null;
export const syncIfStale = () => (STRAPI_URL && Date.now() > nextSync ? (inflight ??= sync().finally(() => (inflight = null))) : null);
