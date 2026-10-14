import { dayPoints, levelAt, eventTag } from '/points.js';

const PAGES = { dash: 'Dashboard', rules: 'Aturan Poin', events: 'Event & konten', logs: 'Log check-in' };
let tok = (() => { try { return sessionStorage.getItem('adm') || ''; } catch { return ''; } })();
let page = location.hash.slice(1) in PAGES ? location.hash.slice(1) : 'dash';
let rules = null, saved = '', cms = null, dash = null, logs = [], logQ = { from: '', to: '', q: '' };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n) => Number(n).toLocaleString('id-ID');
const WIB = 7 * 3600e3;
const wib = (ms) => new Date(ms + WIB).toISOString().slice(0, 19).replace('T', ' ');
const today = () => wib(Date.now()).slice(0, 10);

function toast(msg, bad) {
  const t = Object.assign(document.createElement('div'), { className: 'toast' + (bad ? ' bad' : ''), textContent: msg, role: 'status' });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
async function api(path, opts = {}) {
  const res = await fetch('/api/admin' + path, { ...opts, headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' } });
  if (res.status === 401) { tok = ''; try { sessionStorage.removeItem('adm'); } catch {} render(); throw new Error('Token admin salah'); }
  if (path.endsWith('.csv')) return res.blob();
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Gagal');
  return body;
}

async function load() {
  try {
    if (page === 'dash') dash = await api('/dashboard');
    if (page === 'rules') { rules = await api('/rules'); saved = JSON.stringify(rules); }
    if (page === 'events') cms = await api('/events');
    if (page === 'logs') logs = await api('/logs?' + new URLSearchParams(logQ));
  } catch (e) { return toast(e.message, true); }
  render();
}

// ---------- pages ----------
function dashPage() {
  if (!dash) return '';
  const d = dash, max = Math.max(1, ...d.hourly);
  const delta = (a, b) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}% vs kemarin` : 'kemarin 0');
  return `<div class="grid kpis">
    ${[['Check-in hari ini', fmt(d.today.checkins), delta(d.today.checkins, d.yesterday.checkins)], ['Poin keluar hari ini', fmt(d.today.points), delta(d.today.points, d.yesterday.points)], ['Rata-rata streak', String(d.today.avgStreak).replace('.', ','), 'hari, yang check-in hari ini'], ['Streak aktif', fmt(d.activeStreaks), `dari ${fmt(d.customers)} pelanggan`]]
      .map(([k, v, s]) => `<div class="card kpi"><span style="color:var(--text3);font-weight:600">${k}</span><b class="num">${v}</b><span style="color:var(--text3);font-size:12px">${s}</span></div>`).join('')}
  </div>
  <div class="two">
    <div class="card"><b>Check-in per jam</b> <span style="color:var(--text3)">· hari ini, WIB</span>
      <div class="bars" style="margin-top:14px">${d.hourly.map((n, h) => `<div title="${String(h).padStart(2, '0')}:00 · ${n}" style="height:${(n / max) * 100}%"></div>`).join('')}</div>
      <div class="row" style="justify-content:space-between;color:var(--text3);font-size:12px;margin-top:6px"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div></div>
    <div class="card"><b>Event berjalan</b>${d.events.length ? d.events.map((e) => `<div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--divider)"><span>${esc(e.name)}<br><small style="color:var(--text3)">s.d. ${wib(e.end_at)}</small></span><b style="color:var(--pt-text)">${esc(eventTag(e))}</b></div>`).join('') : '<p style="color:var(--text3)">Tidak ada event aktif.</p>'}</div>
  </div>
  <div class="card"><b>Check-in terbaru</b>${logTable(d.recent)}</div>`;
}

function logTable(rows) {
  if (!rows.length) return '<p style="color:var(--text3)">Belum ada check-in.</p>';
  return `<div style="overflow-x:auto"><table><thead><tr><th>Waktu (WIB)</th><th>Pelanggan</th><th>Streak</th><th>Rincian</th><th>Poin</th><th>Event</th><th>Perangkat</th></tr></thead><tbody>
  ${rows.map((l) => `<tr><td class="num">${wib(l.claimed_at)}</td><td>${esc(l.name || '—')}<br><small style="color:var(--text3)">${esc(l.customer_id)}</small></td><td>${l.streak} hari</td>
  <td class="num" style="color:var(--text3)">${l.base}${l.level_bonus ? ' + ' + l.level_bonus + ' lvl' : ''}${l.cycle_bonus ? ' + ' + l.cycle_bonus + ' H7' : ''}${l.milestone_bonus ? ' + ' + l.milestone_bonus + ' ms' : ''}${l.event_bonus ? ' + ' + l.event_bonus + ' event' : ''}</td>
  <td><b style="color:var(--ok)">+${fmt(l.total)}</b></td><td>${esc(l.events.map((e) => e.name).join(', ') || '—')}</td><td>${esc(l.device || '—')}</td></tr>`).join('')}</tbody></table></div>`;
}

function rulesPage() {
  if (!rules) return '';
  const r = rules;
  // 30-day simulation: Basic level, unbroken streak, no event — same function the server uses. -aj
  const paid = [];
  let life = 0;
  const sim = Array.from({ length: 30 }, (_, i) => { const p = dayPoints(r, i + 1, levelAt(r, life).pct, paid); if (p.milestone) paid.push(i + 1); life += p.total; return p.total; });
  const max = Math.max(...sim);
  const f = (path, v, attrs = '') => `<input data-path="${path}" value="${esc(v)}" ${attrs}>`;
  return `<div class="two">
  <div class="grid">
    <div class="card grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
      <label>Poin dasar per hari<small>Sebelum dikali multiplier.</small>${f('base', r.base, 'type=number min=1')}</label>
      <label>Bonus hari ke-7 siklus<small>Tiap kelipatan 7 hari. Tidak dikali.</small>${f('cycle', r.cycle, 'type=number min=0')}</label>
      <label>Masa berlaku poin (bulan)<small>Sejak poin didapat.</small>${f('expiryMonths', r.expiryMonths, 'type=number min=1')}</label>
    </div>
    <div class="card"><b>Multiplier streak</b><p class="sub">Berlaku mulai hari ke-N sampai baris berikutnya.</p>
      <table><thead><tr><th>Mulai hari</th><th>Multiplier</th><th></th></tr></thead><tbody>
      ${r.tiers.map((t, i) => `<tr><td>${f(`tiers.${i}.from`, t.from, 'type=number min=1')}</td><td>${f(`tiers.${i}.m`, t.m, 'type=number step=0.1 min=1')}</td><td>${i ? `<button class="btn danger" data-del="tiers.${i}">Hapus</button>` : ''}</td></tr>`).join('')}
      </tbody></table><button class="btn sec" style="margin-top:10px" data-add="tiers">+ Tambah</button></div>
    <div class="card"><b>Milestone streak</b><p class="sub">Bonus sekali seumur akun saat streak mencapai hari tertentu.</p>
      <table><thead><tr><th>Hari</th><th>Bonus poin</th><th></th></tr></thead><tbody>
      ${Object.entries(r.milestones).map(([d, p]) => `<tr><td>${f(`ms.${d}.d`, d, 'type=number min=1')}</td><td>${f(`ms.${d}.p`, p, 'type=number min=0')}</td><td><button class="btn danger" data-del="ms.${d}">Hapus</button></td></tr>`).join('')}
      </tbody></table><button class="btn sec" style="margin-top:10px" data-add="ms">+ Tambah</button></div>
    <div class="card"><b>Level</b><p class="sub">Dihitung dari poin seumur hidup. Poin kedaluwarsa tidak menurunkan level.</p>
      <table><thead><tr><th>Nama</th><th>Mulai dari (poin)</th><th>Bonus harian (%)</th><th></th></tr></thead><tbody>
      ${r.levels.map((l, i) => `<tr><td>${f(`levels.${i}.name`, l.name)}</td><td>${f(`levels.${i}.min`, l.min, `type=number min=0 ${i ? '' : 'readonly'}`)}</td><td>${f(`levels.${i}.pct`, l.pct, 'type=number min=0 max=100')}</td><td>${i ? `<button class="btn danger" data-del="levels.${i}">Hapus</button>` : ''}</td></tr>`).join('')}
      </tbody></table><button class="btn sec" style="margin-top:10px" data-add="levels">+ Tambah</button></div>
    <div class="card grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
      <label>Jumlah peringkat (top N)<small>Teks, gambar pop-up & event diatur di Strapi.</small>${f('board.size', r.board.size, 'type=number min=3 max=100')}</label>
    </div>
  </div>
  <div class="card" style="position:sticky;top:20px"><b>Simulasi 30 hari</b><p class="sub">Level Basic di awal, streak tidak putus, tanpa event.</p>
    <div class="bars" style="height:160px;margin-top:12px">${sim.map((v, i) => `<div title="H${i + 1}: +${v}" style="height:${(v / max) * 100}%;background:${v > sim[0] * 3 ? 'var(--pt)' : 'var(--primary)'}"></div>`).join('')}</div>
    <div class="row" style="justify-content:space-between;margin-top:14px"><span>Hari ke-1</span><b>+${fmt(sim[0])}</b></div>
    <div class="row" style="justify-content:space-between"><span>Hari ke-30</span><b>+${fmt(sim[29])}</b></div>
    <div class="row" style="justify-content:space-between;border-top:1px solid var(--divider);padding-top:8px;margin-top:6px"><b>Total 30 hari</b><b style="color:var(--primary)">${fmt(life)} poin</b></div>
  </div></div>
  ${JSON.stringify(rules) !== saved ? '<div class="save">Ada perubahan yang belum disimpan <button class="btn ghost" style="color:#fff" data-act="reset">Batalkan</button><button class="btn" data-act="saveRules">Simpan & terapkan</button></div>' : ''}`;
}

const STS = { Aktif: ['var(--ok-bg)', 'var(--ok)'], Terjadwal: ['var(--subtle)', 'var(--primary)'], Selesai: ['#EEF2F6', 'var(--text3)'] };
const TYPES = { multiplier: 'Multiplier', time_window: 'Jam tertentu', challenge: 'Tantangan' };
function eventsPage() {
  if (!cms) return '';
  const { cms: st, config: c, events } = cms;
  const yn = (b) => (b ? '<b style="color:var(--ok)">Aktif</b>' : '<b style="color:var(--danger)">Mati</b>');
  return `<div class="card row" style="justify-content:space-between">
    <span>${st.source ? `Sumber: <b>${esc(st.source)}</b> · sinkron terakhir ${st.syncedAt ? wib(st.syncedAt) + ' WIB' : 'belum pernah'}` : 'STRAPI_URL belum diisi — pakai konten bawaan.'}
    ${st.error ? `<br><span style="color:var(--danger)">Gagal sinkron: ${esc(st.error)} (data terakhir tetap dipakai)</span>` : ''}</span>
    ${st.source ? '<button class="btn sec" data-act="sync">Sinkron sekarang</button>' : ''}</div>
  ${st.warnings.length ? `<div class="card" style="border-color:var(--pt);background:var(--pt-subtle)">${st.warnings.map((w) => `<div>⚠ ${esc(w)}</div>`).join('')}</div>` : ''}
  <div class="card grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
    <span>Fitur check-in<br>${yn(c.enabled)}</span><span>Pop-up Beranda<br>${yn(c.popupEnabled)}</span><span>Judul<br><b>${esc(c.title)}</b></span>
  </div>
  <div class="card" style="overflow-x:auto"><p class="sub" style="margin:0 0 8px">Event dibuat & dijadwalkan di Strapi (hanya yang sudah Publish). Di sini hanya tampilan baca supaya data tidak dobel.</p>
  <table><thead><tr><th>Event</th><th>Tipe</th><th>Nilai</th><th>Periode (WIB)</th><th>Segmen</th><th>Peserta</th><th>Status</th></tr></thead><tbody>
  ${events.map((e) => `<tr><td><b>${esc(e.name)}</b></td><td>${TYPES[e.type]}${e.type === 'time_window' ? `<br><small style="color:var(--text3)">${e.window_start}–${e.window_end}</small>` : e.type === 'challenge' ? `<br><small style="color:var(--text3)">${e.target_days} hari</small>` : ''}</td><td><b style="color:var(--pt-text)">${esc(eventTag(e))}</b></td>
  <td class="num">${wib(e.start_at)}<br>${wib(e.end_at)}</td><td>${esc(e.segments.join(', ') || 'Semua user')}</td><td>${fmt(e.participants)}</td><td><span class="tag" style="background:${STS[e.status][0]};color:${STS[e.status][1]}">${e.status}</span></td></tr>`).join('') || '<tr><td colspan="7" style="color:var(--text3)">Belum ada event.</td></tr>'}
  </tbody></table></div>`;
}

function logsPage() {
  return `<div class="card row">
    <label>Dari<input type="date" id="l-from" value="${logQ.from || today()}"></label><label>Sampai<input type="date" id="l-to" value="${logQ.to || today()}"></label>
    <label style="flex:1">Cari customer ID / nama<input id="l-q" value="${esc(logQ.q)}"></label>
    <button class="btn" style="align-self:flex-end" data-act="filterLogs">Tampilkan</button><button class="btn sec" style="align-self:flex-end" data-act="csv">Export CSV</button></div>
  <div class="card"><span class="sub" style="margin:0 0 8px;display:block">${fmt(logs.length)} baris${logs.length === 500 ? ' (maks. 500 — pakai Export CSV untuk semua)' : ''} · jam server sampai detik</span>${logTable(logs)}</div>`;
}

function render() {
  if (!tok) {
    $('#root').innerHTML = `<form class="card login" id="login"><b style="font-size:20px">Check-in Admin</b><label>Token admin<input id="tok" type="password" autocomplete="current-password" required></label><button class="btn">Masuk</button></form>`;
    return;
  }
  const body = { dash: dashPage, rules: rulesPage, events: eventsPage, logs: logsPage }[page]();
  $('#root').innerHTML = `<div class="wrap"><nav><div class="logo"><span style="color:var(--primary)">CBN</span> <span style="color:#5BB4E8;font-weight:600">check-in</span></div>
    ${Object.entries(PAGES).map(([k, v]) => `<button data-page="${k}" aria-current="${k === page}">${v}</button>`).join('')}</nav>
    <main><div><h1>${PAGES[page]}</h1></div>${body}</main></div>`;
}

// ---------- rules editing ----------
function setPath(path, value) {
  const [a, b, c] = path.split('.');
  const n = (v) => (v === '' || isNaN(v) ? v : Number(v));
  if (a === 'ms') {
    const ms = { ...rules.milestones };
    if (c === 'd') { const p = ms[b]; delete ms[b]; ms[value] = p; } else ms[b] = n(value);
    rules.milestones = ms;
  } else if (c !== undefined) rules[a][b][c] = c === 'name' ? value : n(value);
  else if (b !== undefined) rules[a][b] = typeof rules[a][b] === 'boolean' ? value : typeof rules[a][b] === 'number' ? n(value) : value;
  else rules[a] = n(value);
}
document.addEventListener('change', (e) => {
  const p = e.target.dataset?.path;
  if (p) { setPath(p, e.target.type === 'checkbox' ? e.target.checked : e.target.value); render(); }
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  tok = $('#tok').value;
  try { sessionStorage.setItem('adm', tok); } catch {}
  load();
});

document.addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t || !Object.keys(t.dataset).length) return;
  const d = t.dataset;
  try {
    if (d.page) { page = d.page; location.hash = page; return load(); }
    if (d.add === 'tiers') rules.tiers.push({ from: (rules.tiers.at(-1)?.from || 0) + 7, m: 1 });
    if (d.add === 'levels') rules.levels.push({ name: 'Level baru', min: (rules.levels.at(-1)?.min || 0) + 1000, pct: 0 });
    if (d.add === 'ms') { let k = 1; while (rules.milestones[k]) k++; rules.milestones = { ...rules.milestones, [k]: 0 }; }
    if (d.del) { const [a, i] = d.del.split('.'); if (a === 'ms') { const ms = { ...rules.milestones }; delete ms[i]; rules.milestones = ms; } else rules[a].splice(+i, 1); }
    if (d.act === 'reset') rules = JSON.parse(saved);
    if (d.act === 'saveRules') { rules = await api('/rules', { method: 'PUT', body: JSON.stringify(rules) }); saved = JSON.stringify(rules); toast('Aturan disimpan — langsung berlaku di app'); }
    if (d.act === 'sync') { await api('/cms/sync', { method: 'POST' }); toast('Sinkron selesai'); return load(); }
    if (d.act === 'filterLogs') { logQ = { from: $('#l-from').value, to: $('#l-to').value, q: $('#l-q').value }; return load(); }
    if (d.act === 'csv') {
      logQ = { from: $('#l-from').value, to: $('#l-to').value, q: $('#l-q').value };
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(await api('/logs.csv?' + new URLSearchParams(logQ))), download: `checkin-${logQ.from}_${logQ.to}.csv` });
      a.click(); URL.revokeObjectURL(a.href); return;
    }
    render();
  } catch (err) { toast(err.message, true); }
});

setInterval(() => page === 'dash' && tok && load(), 10000);
tok ? load() : render();
