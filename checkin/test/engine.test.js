import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-')), 't.sqlite');
process.env.STRAPI_URL = 'https://cms.test';
const { db } = await import('../src/db.js');
const { claim, state, touchCustomer } = await import('../src/engine.js');
const { sync, cmsStatus, getConfig } = await import('../src/cms.js');
const { DEFAULT_RULES: R, dayPoints } = await import('../public/points.js');

const at = (day, hms = '07:00:00') => Date.parse(`${day}T${hms}+07:00`);

test('design numbers: day 7, 14, 30', () => {
  assert.equal(dayPoints(R, 1, 0).total, 10);
  assert.equal(dayPoints(R, 7, 0).total, 12 + 50 + 100);
  assert.equal(dayPoints(R, 14, 0).total, 15 + 50 + 200);
  assert.equal(dayPoints(R, 30, 0).total, 20 + 500);
  assert.equal(dayPoints(R, 7, 0, [7]).total, 12 + 50, 'milestone pays once');
  assert.equal(dayPoints(R, 13, 5).total, 12 + 1, 'Silver +5% of 12 rounds to 1');
});

test('streak follows WIB days, breaks after a gap, claim is once per day', () => {
  touchCustomer('c1', 'Dian Anggraeni', [], 0);
  claim('c1', '', at('2026-10-10', '23:59:59'));
  claim('c1', '', at('2026-10-11', '00:00:00')); // next WIB day, one second later -aj
  assert.equal(claim('c1', '', at('2026-10-11', '12:00:00')).already, true);
  assert.equal(state('c1', at('2026-10-11')).streak, 2);
  assert.equal(state('c1', at('2026-10-12')).streak, 2, 'yesterday claimed: still alive');
  assert.equal(state('c1', at('2026-10-13')).streak, 0, 'missed a day: broken');
  claim('c1', '', at('2026-10-13'));
  assert.equal(state('c1', at('2026-10-13')).streak, 1);
});

test('events: multiplier, time window end exclusive, challenge on Nth day', () => {
  const ins = db.prepare('INSERT INTO events (name, type, value, start_at, end_at, window_start, window_end, target_days, segments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  ins.run('x2', 'multiplier', 2, at('2026-11-01', '00:00:00'), at('2026-11-03', '00:00:00'), null, null, null, '[]');
  ins.run('Early', 'time_window', 20, at('2026-11-01', '00:00:00'), at('2026-11-30', '00:00:00'), '05:00:00', '09:00:00', null, '[]');
  ins.run('HUT', 'challenge', 500, at('2026-11-01', '00:00:00'), at('2026-11-30', '00:00:00'), null, null, 3, '[]');
  ins.run('Batam only', 'multiplier', 3, at('2026-11-01', '00:00:00'), at('2026-11-30', '00:00:00'), null, null, null, '["batam"]');
  touchCustomer('c2', 'Bayu', ['jakarta'], 0);
  claim('c2', '', at('2026-11-01', '08:59:59'));
  claim('c2', '', at('2026-11-02', '09:00:00'));
  claim('c2', '', at('2026-11-03', '06:00:00'));
  const rows = db.prepare("SELECT total, event_bonus FROM checkins WHERE customer_id = 'c2' ORDER BY day").all();
  assert.deepEqual(rows.map((r) => r.event_bonus), [10 + 20, 10, 20 + 500]);
  assert.deepEqual(rows.map((r) => r.total), [40, 20, 530]);
});

test('Strapi sync: v5 + v4 shapes, invalid and clashing events skipped, outage keeps last mirror', async () => {
  const iso = (d, t) => new Date(at(d, t)).toISOString();
  const v5 = { id: 1, name: 'Double', type: 'multiplier', value: '2', start_at: iso('2026-12-01', '00:00:00'), end_at: iso('2026-12-03', '00:00:00'), banner: { url: '/uploads/b.png' } };
  const v4 = { id: 2, attributes: { name: 'Early', type: 'time_window', value: 20, start_at: iso('2026-12-01', '00:00:00'), end_at: iso('2026-12-31', '00:00:00'), window_start: '05:00:00.000', window_end: '09:00:00.000', segments: 'Jakarta, Surabaya' } };
  const clash = { id: 3, name: 'Triple', type: 'multiplier', value: 3, start_at: iso('2026-12-02', '00:00:00'), end_at: iso('2026-12-04', '00:00:00') };
  const bad = { id: 4, name: 'Too big', type: 'multiplier', value: 5, start_at: iso('2026-12-01', '00:00:00'), end_at: iso('2026-12-02', '00:00:00') };
  const responses = {
    '/api/checkin-config': { data: { id: 1, enabled: true, popup_enabled: false, entry_title: 'Misi Harian', popup_image: { url: 'https://img.test/h.png' } } },
    '/api/checkin-events': { data: [v5, v4, clash, bad], meta: { pagination: { pageCount: 1 } } },
  };
  globalThis.fetch = async (url) => ({ ok: true, status: 200, json: async () => responses[new URL(url).pathname] });
  await sync();
  const events = db.prepare('SELECT id, name, segments, window_start, banner_url FROM events ORDER BY id').all();
  assert.deepEqual(events.map((e) => e.name), ['Double', 'Early']);
  assert.equal(events[0].banner_url, 'https://cms.test/uploads/b.png');
  assert.equal(events[1].window_start, '05:00:00');
  assert.equal(events[1].segments, '["jakarta","surabaya"]');
  assert.equal(cmsStatus().warnings.length, 2);
  assert.deepEqual(getConfig(), { enabled: true, popupEnabled: false, title: 'Misi Harian', popupImage: 'https://img.test/h.png', successImage: '' });

  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await sync();
  assert.match(cmsStatus().error, /503/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM events').get().n, 2, 'mirror kept');
});
