// Pure point rules. Shared by the server (src/engine.js) and the admin simulator (admin.html). -aj
export const DEFAULT_RULES = {
  base: 10,
  cycle: 50,
  expiryMonths: 12,
  tiers: [{ from: 1, m: 1 }, { from: 7, m: 1.2 }, { from: 14, m: 1.5 }, { from: 30, m: 2 }],
  milestones: { 7: 100, 14: 200, 30: 500, 60: 1000, 100: 2000 },
  levels: [
    { name: 'Basic', min: 0, pct: 0 },
    { name: 'Silver', min: 1000, pct: 5 },
    { name: 'Gold', min: 5000, pct: 10 },
    { name: 'Platinum', min: 15000, pct: 20 },
  ],
  board: { size: 10 },
};

// tiers and levels are kept sorted ascending by the server -aj
export const multiplier = (r, streak) => r.tiers.reduce((m, t) => (streak >= t.from ? t.m : m), 1);
export const levelAt = (r, lifetime) => r.levels.reduce((a, l) => (lifetime >= l.min ? l : a), r.levels[0]);
export const nextLevel = (r, lifetime) => r.levels.find((l) => l.min > lifetime) || null;

// streak = the streak day being claimed (1-based). Milestones pay once per customer, ever. -aj
export function dayPoints(r, streak, levelPct, paidMilestones = []) {
  const m = multiplier(r, streak);
  const base = Math.round(r.base * m);
  const lb = Math.round((base * levelPct) / 100);
  const cycle = streak % 7 === 0 ? r.cycle : 0;
  const milestone = (!paidMilestones.includes(streak) && r.milestones[streak]) || 0;
  return { m, base, lb, cycle, milestone, total: base + lb + cycle + milestone };
}

// hms = claim time 'HH:MM:SS' WIB; count = customer's check-ins inside the event period incl. this one.
// Multiplier only multiplies base + level bonus, never cycle/milestone bonuses. -aj
export function eventBonus(ev, p, hms, count) {
  if (ev.type === 'multiplier') return Math.round((p.base + p.lb) * (ev.value - 1));
  if (ev.type === 'time_window') return hms >= ev.window_start && hms < ev.window_end ? ev.value : 0;
  if (ev.type === 'challenge') return count === ev.target_days ? ev.value : 0;
  return 0;
}

export const eventTag = (ev) => (ev.type === 'multiplier' ? '×' + String(ev.value).replace('.', ',') : '+' + ev.value);
