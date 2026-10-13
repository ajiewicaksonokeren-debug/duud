import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-')), 't.sqlite');
const { db } = await import('../src/db.js');
const { claim, state, touchCustomer } = await import('../src/engine.js');
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
  touchCustomer('c1', 'Dian Anggraeni', 0);
  claim('c1', '', at('2026-10-10', '23:59:59'));
  claim('c1', '', at('2026-10-11', '00:00:00')); // next WIB day, one second later
  assert.equal(claim('c1', '', at('2026-10-11', '12:00:00')).already, true);
  assert.equal(state('c1', at('2026-10-11')).streak, 2);
  assert.equal(state('c1', at('2026-10-12')).streak, 2, 'yesterday claimed: still alive');
  assert.equal(state('c1', at('2026-10-13')).streak, 0, 'missed a day: broken');
  claim('c1', '', at('2026-10-13'));
  assert.equal(state('c1', at('2026-10-13')).streak, 1);
});

test('events: multiplier, time window end exclusive, challenge on Nth day', () => {
  const ins = db.prepare('INSERT INTO events (name, type, value, start_at, end_at, window_start, window_end, target_days, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)');
  ins.run('x2', 'multiplier', 2, at('2026-11-01', '00:00:00'), at('2026-11-03', '00:00:00'), null, null, null);
  ins.run('Early', 'time_window', 20, at('2026-11-01', '00:00:00'), at('2026-11-30', '00:00:00'), '05:00:00', '09:00:00', null);
  ins.run('HUT', 'challenge', 500, at('2026-11-01', '00:00:00'), at('2026-11-30', '00:00:00'), null, null, 3);
  touchCustomer('c2', 'Bayu', 0);
  claim('c2', '', at('2026-11-01', '08:59:59'));
  claim('c2', '', at('2026-11-02', '09:00:00'));
  claim('c2', '', at('2026-11-03', '06:00:00'));
  const rows = db.prepare("SELECT total, event_bonus FROM checkins WHERE customer_id = 'c2' ORDER BY day").all();
  assert.deepEqual(rows.map((r) => r.event_bonus), [10 + 20, 10, 20 + 500]);
  assert.deepEqual(rows.map((r) => r.total), [40, 20, 530]);
});
