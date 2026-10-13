// mode=toast: small pop-up WebView over Beranda. mode=page: full WebView under the app's own header ("Check-in Harian" + ×).
// The app passes ?code=<one-time code>; it is exchanged for an HttpOnly session cookie and removed from the URL.
const qs = new URLSearchParams(location.search);
const mode = qs.get('mode') === 'toast' ? 'toast' : 'page';
const code = qs.get('code');
if (code) history.replaceState(null, '', `${location.pathname}?mode=${mode}${location.hash}`);
const device = /Android/i.test(navigator.userAgent) ? 'android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'ios' : 'web';
document.body.classList.toggle('toast', mode === 'toast');

// Bridge: Android addJavascriptInterface "CBNBridge", iOS WKScriptMessageHandler "cbn", or the demo page (iframe parent).
function send(msg) {
  if (window.CBNBridge) return CBNBridge.postMessage(JSON.stringify(msg)), true;
  if (window.webkit?.messageHandlers?.cbn) return webkit.messageHandlers.cbn.postMessage(msg), true;
  if (parent !== window) return parent.postMessage({ cbnCheckin: msg }, location.origin), true;
  return false;
}

let S = null, skew = 0, board = null, boardMode = 'points', busy = false, err = '', expired = false;
const now = () => Date.now() + skew; // server clock; countdowns never trust the phone clock
const view = () => (mode === 'page' && location.hash === '#rank' ? 'rank' : 'main');

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, { ...opts, headers: { 'content-type': 'application/json' } });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) { onExpired(); throw new Error(body.error || 'Sesi berakhir.'); }
  if (!res.ok && res.status !== 409) throw new Error(body.error || 'Gagal memuat. Coba lagi.');
  return body;
}
function onExpired() {
  if (expired) return;
  expired = true;
  send({ type: 'session_expired' }); // app reloads this WebView with a fresh code
  if (mode === 'toast') send({ type: 'close' });
  render();
}

const fmt = (n) => Number(n).toLocaleString('id-ID');
const fm = (m) => String(m).replace('.', ',');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const WIB = 7 * 3600e3;
const hms = (ms) => new Date(ms + WIB).toISOString().slice(11, 19);
const iso = (ms) => new Date(ms + WIB).toISOString().slice(0, 19) + '+07:00';
const ini = (n) => String(n || '?').split(/[\s.]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const clock = (s) => [s / 3600, (s % 3600) / 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':');
const until = (ms) => { const s = Math.max(0, Math.floor((ms - now()) / 1000)), d = Math.floor(s / 86400); return (d ? d + 'h ' : '') + clock(s % 86400); };
const relDay = (day) => { const d = Math.round((Date.parse(S.today) - Date.parse(day)) / 864e5); return d === 0 ? 'Hari ini' : d === 1 ? 'Kemarin' : d + ' hari lalu'; };
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const ICON = {
  fire: (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="var(--pt)" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>`,
  check: (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
};
const coin = (s) => `<span class="coin" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.55)}px" aria-hidden="true">P</span>`;
const cd = (to) => `<span class="cd num" data-to="${to}">${until(to)}</span>`;
const bg = (u) => (u ? ` style="background-image:url('${esc(u)}')"` : '');

async function start() {
  try {
    if (code) await api('/session', { method: 'POST', body: JSON.stringify({ code }) });
    await load();
  } catch (e) {
    err = e.message;
    render();
  }
}
async function load() {
  S = await api('/checkin/state');
  skew = S.now - Date.now();
  err = '';
  // The web app decides whether the pop-up shows; the app just releases the WebView on "close".
  if (mode === 'toast' && !S.showToast) return send({ type: 'close' });
  render();
  if (view() === 'rank') loadBoard();
}
async function loadBoard() {
  board = await api('/checkin/leaderboard?mode=' + boardMode).catch(() => null);
  render();
}
async function doClaim() {
  if (busy) return;
  busy = true; err = ''; render();
  try {
    S = (await api('/checkin/claim', { method: 'POST', body: JSON.stringify({ device }) })).state;
    send({ type: 'checkin_success', points: S.todayPoints.total, claimed_at: iso(S.claimedAt) });
    send({ type: 'haptic', style: 'success' });
  } catch (e) { err = e.message; }
  busy = false; render();
}
function openFull() {
  if (!send({ type: 'open_full' })) location.href = '?mode=page';
}
function dismiss() {
  api('/checkin/dismiss', { method: 'POST' }).catch(() => {});
  send({ type: 'close' });
}

// ---------- pieces ----------
const mainEvent = () => S.events.find((e) => e.type !== 'challenge') || S.events[0];
function evSub(e) {
  if (e.type === 'time_window') {
    const t = hms(now());
    return t < e.windowStart ? `Mulai ${e.windowStart} WIB hari ini` : t < e.windowEnd ? `Berlaku sampai ${e.windowEnd} WIB hari ini` : `Sudah lewat ${e.windowEnd} · coba besok lebih pagi`;
  }
  if (e.type === 'challenge') return `Progres ${e.progress}/${e.targetDays} hari · berakhir ${cd(e.endAt)}`;
  return `Berakhir dalam ${cd(e.endAt)}`;
}
const evDesc = (e) => e.type === 'multiplier' ? `Poin harian (base + multiplier + bonus level) dikali ${fm(e.value)} selama event.`
  : e.type === 'time_window' ? `Check-in antara ${e.windowStart}–${e.windowEnd} WIB dapat +${fmt(e.value)} poin. Dihitung dari jam server, sampai detik.`
  : `Check-in ${e.targetDays} hari selama event, dapat +${fmt(e.value)} poin di hari ke-${e.targetDays}.`;
const evBanner = (e) => e ? `<div class="ev"><span class="ev-l">EVENT</span><div style="flex:1;min-width:0;display:flex;flex-direction:column"><b style="font-size:13.5px">${esc(e.name)}</b><span class="num" style="font-size:11.5px;color:var(--pt-text)">${evSub(e)}</span></div><b style="font-size:15px;color:var(--pt-text)">${esc(e.tag)}</b></div>` : '';

const week = () => `<div class="week" role="list">${S.week.map((d) => {
  const cls = d.status === 'locked' && d.bonus ? 'bonus' : d.status;
  const label = d.status === 'done' ? 'selesai' : d.status === 'today' ? 'hari ini' : 'mendatang';
  return `<div class="tile ${cls}" role="listitem" aria-label="Hari ${d.day}, ${label}, ${d.points} poin">${d.eventTag && d.status !== 'done' ? `<i>${esc(d.eventTag)}</i>` : ''}<small>H${d.day}</small>${d.status === 'done' ? ICON.check(13) : `<b>+${fmt(d.points)}</b>`}</div>`;
}).join('')}</div>`;

function nextBonusText() {
  const n = S.nextBonus;
  return n.inDays === 0 ? 'Hari ini hari bonus!' : `Bonus +${fmt(n.points)} poin di hari ke-${n.day} ${n.inDays === 1 ? '(besok)' : `(${n.inDays} hari lagi)`}`;
}

function toast() {
  return `<div class="toast-card" role="dialog" aria-label="Check-in harian">
    <div style="width:34px;height:34px;border-radius:10px;background:var(--pt-subtle);display:flex;align-items:center;justify-content:center;flex-shrink:0">${ICON.fire(18)}</div>
    <button class="open" data-a="open"><b class="ellipsis" style="font-size:13.5px;font-weight:800">Check-in hari ini +${fmt(S.todayPoints.total)} poin</b><span class="muted num ellipsis" style="font-size:11.5px">Streak ${S.streak} hari · reset ${cd(S.resetAt)}</span></button>
    <button class="pill" style="height:34px;font-size:12.5px;padding:0 12px" data-a="open">Klaim</button>
    <button class="x" data-a="dismiss" aria-label="Tutup">×</button>
  </div>`;
}

function mission() {
  const p = S.todayPoints;
  if (!S.claimed) return `<div class="card" style="margin:14px 16px 0;padding:16px;display:flex;flex-direction:column;gap:16px">
    <div class="hero"${bg(S.config.popupImage)}><span class="chip-w">${ICON.fire(14)}Streak ${S.streak} hari</span></div>
    ${evBanner(mainEvent())}
    <div class="row" style="align-items:flex-end"><div style="display:flex;flex-direction:column;gap:4px"><b style="font-size:21px;font-weight:800">${esc(S.config.title)}</b><span class="muted" style="font-size:12.5px">${nextBonusText()}</span></div><span class="mult">×${fm(S.multiplier)}</span></div>
    ${week()}
    <div class="today-box"><div style="display:flex;flex-direction:column;gap:2px"><span class="muted" style="font-size:13px">Poin hari ini</span><span class="muted" style="font-size:12px">Rincian di bawah</span></div><div style="display:flex;align-items:center;gap:8px">${coin(24)}<b style="font-size:28px;font-weight:800">+${fmt(p.total)}</b></div></div>
    <button class="btn" data-a="claim" ${busy || !S.config.enabled ? 'disabled' : ''}>${busy ? 'Mencatat…' : 'Klaim Poin'}</button>
    ${err ? `<span role="alert" style="color:#E11D2E;font-size:13px;text-align:center">${esc(err)}</span>` : ''}
    <span class="muted" style="display:flex;align-items:center;gap:6px;font-size:12.5px">${ICON.clock}Reset dalam <b style="color:var(--text)">${cd(S.resetAt)}</b></span>
  </div>`;
  return `<div class="card" style="margin:14px 16px 0;padding:16px;display:flex;flex-direction:column;gap:16px">
    <div class="hero"${bg(S.config.successImage)}></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="display:flex;align-items:center;gap:8px">${coin(28)}<b style="font-size:30px;font-weight:800">+${fmt(p.total)} Poin</b></div>
      <span class="muted" style="font-size:14px">Streak ${S.streak} hari · saldo ${fmt(S.balance)} poin</span>
      ${p.events.filter((e) => e.bonus).map((e) => `<span style="font-size:12.5px;font-weight:700;color:var(--pt-text)">Termasuk bonus ${esc(e.name)} +${fmt(e.bonus)}</span>`).join('')}
      <span class="num" style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:var(--dark);background:var(--subtle);padding:6px 12px;border-radius:999px">${ICON.clock}Tercatat ${hms(S.claimedAt)} WIB</span>
    </div>
    ${week()}
    <button class="btn" data-a="close">Kembali ke Beranda</button>
  </div>`;
}

function main() {
  if (!S.config.enabled && !S.claimed) return `<div class="err">Check-in harian sedang tidak aktif. Coba lagi nanti.</div>`;
  const p = S.todayPoints, lv = S.level, e = mainEvent();
  const pct = lv.next ? Math.min(100, Math.round(((S.lifetime - lv.min) / (lv.next.min - lv.min)) * 100)) : 100;
  const rows = [
    ['Base harian', fmt(S.basePoints), true],
    ['Multiplier streak ×' + fm(p.m), '= ' + fmt(p.base), true],
    [`Bonus Cybro ${lv.name} +${lv.pct}%`, p.lb ? '+' + fmt(p.lb) : '—', !!p.lb],
    ['Bonus hari ke-7', p.cycle ? '+' + fmt(p.cycle) : '—', !!p.cycle],
    [`Milestone ${S.claimed ? S.streak : S.streak + 1} hari`, p.milestone ? '+' + fmt(p.milestone) : '—', !!p.milestone],
    ...S.events.map((ev) => { const b = p.events.find((x) => x.id === ev.id)?.bonus || 0; return ['Event ' + ev.name, b ? '+' + fmt(b) : '—', !!b]; }),
  ];
  const r = S.rank;
  const gap = !r ? 'Check-in untuk masuk peringkat' : r.position <= S.boardSize ? `Anda di top ${S.boardSize}!` : S.boardCutoff != null ? `${fmt(S.boardCutoff - r.points + 1)} poin lagi ke top ${S.boardSize}` : '';
  return `<div class="page">
    ${mission()}
    <div style="margin:0 16px;border-radius:16px;background:var(--grad);padding:18px;color:#fff;display:flex;flex-direction:column;gap:12px">
      <div class="row"><span style="font-size:13px;opacity:.9">Saldo poin</span><span style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);font-size:11px;font-weight:700;padding:4px 10px;border-radius:12px">Cybro ${esc(lv.name)} · +${lv.pct}%</span></div>
      <div style="display:flex;align-items:center;gap:10px">${coin(30)}<b class="num" style="font-size:32px;font-weight:800;letter-spacing:-.01em">${fmt(S.balance)}</b></div>
      <div class="prog" style="background:rgba(255,255,255,.25)" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%;background:#fff"></div></div>
      <span style="font-size:12px;opacity:.9">${fmt(S.lifetime)} poin seumur hidup · ${lv.next ? `${fmt(lv.next.min - S.lifetime)} lagi ke ${esc(lv.next.name)}` : 'level tertinggi'}</span>
    </div>
    ${e ? `<div class="card" style="border-color:var(--pt-bd);overflow:hidden">
      <div style="position:relative;height:110px;background:linear-gradient(135deg,#FFB020,#F08A00) center/cover;${e.bannerUrl ? `background-image:url('${esc(e.bannerUrl)}')` : ''}"><span style="position:absolute;top:10px;left:10px;background:#fff;color:var(--pt-text);font-size:10.5px;font-weight:800;padding:4px 8px;border-radius:6px;letter-spacing:.04em">EVENT AKTIF</span></div>
      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px">
        <div class="row"><b style="font-size:15px">${esc(e.name)}</b><b style="font-size:15px;color:var(--pt-text)">${esc(e.tag)}</b></div>
        <span style="font-size:13px;color:var(--text2);line-height:1.5">${evDesc(e)}</span>
        ${e.type === 'challenge' ? `<div class="prog" style="background:#FFE9BF"><div style="width:${(e.progress / e.targetDays) * 100}%;background:var(--pt)"></div></div>` : ''}
        <span class="muted num" style="font-size:12px">${evSub(e)}</span>
      </div></div>` : ''}
    <div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:9px">
      <b style="font-size:15px">Rincian poin hari ini${S.claimed ? '' : ' (kalau klaim sekarang)'}</b>
      ${rows.map(([k, v, on]) => `<div class="row" style="font-size:13.5px;opacity:${on ? 1 : 0.45}"><span class="muted">${esc(k)}</span><span style="font-weight:700">${v}</span></div>`).join('')}
      <div style="height:1px;background:var(--divider)"></div>
      <div class="row"><b style="font-size:14px">Total</b><b style="font-size:17px;color:var(--primary)">+${fmt(p.total)}</b></div>
    </div>
    <button class="card" data-a="rank" style="padding:14px 16px;display:flex;align-items:center;gap:12px;text-align:left;color:inherit">
      <span style="width:46px;height:46px;border-radius:12px;background:var(--subtle);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex-shrink:0">${r ? '#' + r.position : '–'}</span>
      <span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">Peringkat bulan ini</b><span class="muted" style="font-size:12px">${gap}</span></span>
      <span style="font-size:18px;color:var(--primary)">›</span>
    </button>
    <div class="card" style="padding:4px 16px"><b style="display:block;font-size:15px;padding:12px 0 4px">Riwayat</b><div class="list">
      ${S.ledger.length ? S.ledger.flatMap((l) => {
        const t = `${relDay(l.day)} · ${hms(l.claimedAt)} WIB`;
        const line = (title, v) => `<div class="row"><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:13.5px;font-weight:600">${esc(title)}</span><span class="muted num" style="font-size:11.5px">${t}</span></div><b style="font-size:14px;color:var(--ok)">+${fmt(v)}</b></div>`;
        return [line('Check-in hari ke-' + l.streak, l.total - l.eventBonus), ...l.events.map((x) => line('Bonus ' + x.name, x.bonus))];
      }).join('') : '<div class="muted" style="font-size:13px">Belum ada riwayat. Klaim check-in pertama Anda hari ini.</div>'}
    </div></div>
  </div>`;
}

function rank() {
  const month = MONTHS[+S.today.slice(5, 7) - 1] + ' ' + S.today.slice(0, 4);
  const val = (u) => boardMode === 'points' ? fmt(u.value) + ' P' : u.value + ' hari';
  const top = board?.top || [];
  const pod = [[1, 60, 64, '#5BB4E8', '#C9D3DD'], [0, 76, 92, 'var(--primary)', 'var(--pt)'], [2, 60, 48, '#8FD0F5', '#E0B48A']];
  const me = board?.me;
  return `<div class="subbar"><button data-a="back" aria-label="Kembali">‹</button><div style="display:flex;flex-direction:column"><b style="font-size:16.5px">Peringkat Check-in</b><span class="muted" style="font-size:11.5px">Top ${S.boardSize} · ${month}</span></div></div>
  <div class="page" style="padding:14px 16px 110px">
    <div class="seg"><button aria-pressed="${boardMode === 'points'}" data-mode="points">Poin bulan ini</button><button aria-pressed="${boardMode === 'streak'}" data-mode="streak">Streak</button></div>
    ${!board ? '<div class="skel" style="margin:0"></div>' : !top.length ? '<div class="err" style="margin:0">Belum ada yang check-in. Jadilah yang pertama!</div>' : `
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:end">${pod.map(([i, av, ped, bgc, ring]) => { const u = top[i]; return u ? `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0">
        <div class="av" style="width:${av}px;height:${av}px;background:var(--subtle);color:var(--primary);font-size:20px;box-shadow:0 0 0 3px #fff,0 0 0 5px ${ring}">${esc(ini(u.name))}</div>
        <div style="display:flex;flex-direction:column;align-items:center;max-width:100%"><b class="ellipsis" style="font-size:13px;max-width:100%">${esc(u.name)}</b><span style="font-size:12px;font-weight:700;color:var(--primary)">${val(u)}</span></div>
        <div style="width:100%;height:${ped}px;border-radius:12px 12px 6px 6px;background:${bgc};color:#fff;display:flex;justify-content:center;padding-top:8px;font-size:20px;font-weight:800">${i + 1}</div>
      </div>` : '<div></div>'; }).join('')}</div>
    <div class="card" style="padding:2px 14px">
      ${top.slice(3).map((u) => `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--divider)"><span style="width:20px;font-size:13px;font-weight:700;color:var(--text3);text-align:center">${u.rank}</span><div class="av" style="width:36px;height:36px;background:#EEF2F6;color:var(--text2);font-size:13px">${esc(ini(u.name))}</div><div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:13.5px;font-weight:700">${esc(u.name)}</span><span class="muted num" style="font-size:11.5px">Check-in ${hms(u.lastAt)}</span></div><b style="font-size:13.5px">${val(u)}</b></div>`).join('')}
      <span class="muted" style="display:block;font-size:11.5px;padding:10px 0;line-height:1.5">Seri? Yang check-in lebih awal (sampai detik) di atas.</span>
    </div>`}
  </div>
  <div class="me"><b style="font-size:15px;min-width:32px">${me ? '#' + me.rank : '–'}</b><div class="av" style="width:36px;height:36px;background:rgba(255,255,255,.15);font-size:13px">${esc(ini(S.name))}</div><div style="flex:1;min-width:0;display:flex;flex-direction:column"><span class="ellipsis" style="font-size:13.5px;font-weight:700">${esc(S.name || 'Anda')} (Anda)</span><span class="num" style="font-size:11.5px;opacity:.8">${S.claimed ? `Check-in ${hms(S.claimedAt)} WIB` : 'Belum check-in hari ini'}</span></div><b style="font-size:13.5px">${me ? val(me) : boardMode === 'points' ? '0 P' : '0 hari'}</b></div>`;
}

function render() {
  const app = document.getElementById('app');
  if (expired) { app.innerHTML = mode === 'page' ? '<div class="err">Sesi berakhir. Tutup halaman ini lalu buka lagi.</div>' : ''; return; }
  if (!S) { app.innerHTML = err ? `<div class="err">${esc(err)}<br><button class="btn" style="margin-top:12px" data-a="retry">Coba lagi</button></div>` : mode === 'page' ? '<div class="skel"></div>' : ''; return; }
  app.innerHTML = mode === 'toast' ? toast() : view() === 'rank' ? rank() : main();
  if (mode === 'toast') send({ type: 'resize', height: Math.ceil(document.documentElement.getBoundingClientRect().height) });
}

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-a],[data-mode]');
  if (!t) return;
  if (t.dataset.mode) { boardMode = t.dataset.mode; board = null; render(); return loadBoard(); }
  ({
    claim: doClaim, dismiss, open: openFull, retry: start,
    close: () => send({ type: 'close' }),
    rank: () => { location.hash = 'rank'; },
    back: () => history.back(),
  })[t.dataset.a]?.();
});
// #rank lives in history, so the Android back button returns to the mission page.
window.addEventListener('hashchange', () => { render(); scrollTo(0, 0); if (view() === 'rank') loadBoard(); });

// Countdowns tick locally; screen readers get one update per minute. Day rollover refetches state.
let lastMin = -1;
setInterval(() => {
  document.querySelectorAll('.cd').forEach((el) => (el.textContent = until(+el.dataset.to)));
  if (!S || expired) return;
  if (now() >= S.resetAt) load().catch(() => {});
  const m = Math.floor(now() / 60000);
  if (m !== lastMin && !S.claimed) { lastMin = m; document.getElementById('live').textContent = 'Reset check-in dalam ' + until(S.resetAt).slice(0, -3).replace(':', ' jam ') + ' menit'; }
}, 1000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && S && !expired && load().catch(() => {}));

start();
