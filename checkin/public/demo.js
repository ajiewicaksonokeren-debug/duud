// Plays the CBN app's part: two WebView containers (toast over Beranda, full page with the app header) + the bridge.
const $ = (id) => document.getElementById(id);
const log = (m) => ($('log').textContent = JSON.stringify(m) + '\n' + $('log').textContent);

// Stands in for the CBN backend's POST /checkin/session (one-time code, 60 s).
async function newCode() {
  const r = await fetch('/dev/code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customer_id: $('cid').value, name: $('nm').value, segments: $('seg').value.split(',') }) });
  return (await r.json()).code;
}

async function openToast() {
  $('toast').src = `/app?mode=toast&code=${await newCode()}`;
  $('toast').style.height = '64px';
  $('toast').hidden = false;
}
const closeToast = () => { $('toast').hidden = true; $('toast').src = 'about:blank'; };
async function openFull() {
  $('fullweb').src = `/app?mode=page&code=${await newCode()}`;
  $('full').hidden = false;
}
const closeFull = () => { $('full').hidden = true; $('fullweb').src = 'about:blank'; };

window.addEventListener('message', (e) => {
  const m = e.data?.cbnCheckin;
  if (e.origin !== location.origin || !m || typeof m !== 'object') return;
  log(m);
  const fromToast = e.source === $('toast').contentWindow;
  if (m.type === 'resize' && fromToast) $('toast').style.height = m.height + 'px';
  if (m.type === 'open_full') { closeToast(); openFull(); }
  if (m.type === 'close') fromToast ? closeToast() : closeFull();
  if (m.type === 'checkin_success') closeToast();
  if (m.type === 'session_expired' && !fromToast) openFull();
});
$('x').onclick = closeFull;
$('login').onclick = () => { $('uname').textContent = $('nm').value + ' ⌄'; closeFull(); openToast(); };
$('menu').onclick = openFull;
$('login').onclick();
