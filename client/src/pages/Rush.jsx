import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import RushTank from '../components/RushTank.jsx';
import { openExternal } from '../utils/openExternal.js';

// Own keyboard instead of a text field: there is no delete key and nothing to paste into,
// on every OS keyboard and IME.
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export default function Rush() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [rules, setRules] = useState(null);
  const [run, setRun] = useState(null);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  const clock = useRef({ total: 0, q: 0 });
  const busy = useRef(false);

  useEffect(() => {
    api.get('/rush/status').then(({ data }) => setRules(data));
  }, []);

  // Local countdowns are feedback only; the server re-checks both limits on every answer.
  useEffect(() => {
    if (!run || result) return;
    const id = setInterval(() => {
      if (busy.current) return;
      const t = performance.now();
      setNow(t);
      if (t - clock.current.total > rules.totalMs) finish({ status: 'lost', reason: `Waktu ${rules.totalMs / 1000} detik habis` });
      else if (t - clock.current.q > rules.fastMs) finish({ status: 'lost', reason: `Lebih dari ${rules.fastMs / 1000} detik` });
    }, 50);
    return () => clearInterval(id);
  }, [run, result, rules]);

  // Physical keyboards (web): letters only, Backspace/Delete do nothing.
  useEffect(() => {
    const onKey = (e) => /^[a-z]$/i.test(e.key) && press(e.key.toUpperCase());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function finish(r) {
    setResult(r);
    refreshMe();
  }

  async function start() {
    setError('');
    try {
      const { data } = await api.post('/rush/start');
      const t = performance.now();
      clock.current = { total: t, q: t };
      setNow(t);
      setTyped('');
      setRun({ id: data.runId, question: data.question });
    } catch (err) {
      setError(err?.response?.data?.error || 'Gagal mulai Rush.');
    }
  }

  async function press(ch) {
    if (!run || result || busy.current) return;
    const next = typed + ch;
    setTyped(next);
    if (next.length < run.question.letters) return;
    busy.current = true;
    try {
      const { data } = await api.post(`/rush/${run.id}/answer`, { answer: next });
      if (data.status === 'next') {
        clock.current.q = performance.now();
        setTyped('');
        setRun({ ...run, question: data.question });
      } else {
        finish(data);
      }
    } catch (err) {
      finish({ status: 'lost', reason: err?.response?.data?.error || 'Koneksi putus' });
    } finally {
      busy.current = false;
    }
  }

  if (!rules) return <div className="app-shell"><div className="rush"><div className="empty-state">Memuat…</div></div></div>;

  const full = (user?.rushMeter ?? 0) >= (user?.rushMeterMax ?? 5);
  const leftMs = rules.totalMs - (now - clock.current.total);
  const qPct = Math.max(0, 1 - (now - clock.current.q) / rules.fastMs) * 100;

  return (
    <div className="app-shell">
      <div className="rush">
        {result?.status === 'won' && (
          <>
            <h1 className="display xl" style={{ color: 'var(--yellow)', fontSize: 64 }}>MENANG!</h1>
            <div className="prize">{result.prizeName}</div>
            <p className="fine" style={{ fontSize: 12 }}>
              {rules.questions} SOAL KELAR DI BAWAH {rules.totalMs / 1000} DETIK. ISI DATA KLAIM — LINK SEKALI PAKAI, HANGUS 7 HARI.
              HADIAH DIKIRIM MANUAL SETELAH VERIFIKASI.
            </p>
            <button className="btn lg" onClick={() => openExternal(result.claimUrl)}>KLAIM HADIAH ↗</button>
            <button className="btn ghost" onClick={() => navigate('/')}>BALIK</button>
          </>
        )}

        {result?.status === 'lost' && (
          <>
            <h1 className="display xl" style={{ color: 'var(--paper)', fontSize: 64 }}>GAGAL</h1>
            <div className="prize" style={{ background: 'var(--orange)', color: 'var(--white)' }}>{result.reason}</div>
            <p className="fine" style={{ fontSize: 12 }}>ISI TANGKI LAGI BUAT COBA LAGI.</p>
            <button className="btn lg" onClick={() => navigate('/')}>BALIK MAIN</button>
          </>
        )}

        {!result && run && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="display md" style={{ color: 'var(--paper)' }}>RUSH {run.question.index + 1}/{rules.questions}</div>
              <div className="display sm accent">{(Math.max(0, leftMs) / 1000).toFixed(1)}s</div>
            </div>
            <div className="timer-bar"><div style={{ width: `${Math.max(0, leftMs / rules.totalMs) * 100}%` }} /></div>
            <QuestionCard clues={run.question.clues} />
            <div className="timer-bar q"><div style={{ width: `${qPct}%` }} /></div>
            <div className="answer-mask">
              <div className="word">
                {Array.from({ length: run.question.letters }, (_, i) => (
                  <span key={i} className={`slot ${typed[i] ? 'filled' : ''}`}>{typed[i]}</span>
                ))}
              </div>
            </div>
            <div className="kb">
              {ROWS.map((row) => (
                <div key={row}>
                  {[...row].map((ch) => (
                    <button
                      key={ch}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        press(ch);
                      }}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {!result && !run && (
          <>
            <div className="mono accent" style={{ letterSpacing: '.2em' }}>Hadiah uang tunai</div>
            <h1 className="display xl" style={{ color: 'var(--paper)', fontSize: 64 }}>
              RUSH<br /><span className="accent">MOMENT</span>
            </h1>
            <div className="prize">{rules.prizeName}</div>
            <RushTank user={user} />
            <ul className="rules">
              <li>{rules.questions} soal di luar level, jawaban 1 kata</li>
              <li>Tiap soal &lt; {rules.fastMs / 1000} detik, total {rules.totalMs / 1000} detik</li>
              <li>Nggak ada hapus / backspace, nggak bisa paste</li>
              <li>Salah 1 = gagal. Tangki kepake begitu mulai</li>
              <li>Kuota {rules.dailyWinners} pemenang/hari — sisa {rules.slotsLeft}</li>
            </ul>
            {full ? (
              <button className="btn lg" onClick={start} disabled={!rules.slotsLeft}>MULAI ⚡</button>
            ) : (
              <p className="note" style={{ margin: 0 }}>
                ISI TANGKI: JAWAB SOAL LEVEL BENAR DI PERCOBAAN PERTAMA, &lt; {rules.fastMs / 1000} DETIK, TANPA HAPUS &amp; TANPA
                BANTUAN. SALAH / BANTUAN / HAPUS = TANGKI KOSONG. LAMBAT = NGGAK NAMBAH.
              </p>
            )}
            {error && <p className="error-text">{error}</p>}
            <p className="fine">
              S&amp;K: Gratis, tidak bisa dibeli. Hadiah disponsori Tebak Gambar × esportsku dan dikirim manual setelah
              verifikasi data. Apple dan Google tidak terlibat dan bukan sponsor kegiatan ini.
            </p>
            <button className="btn ghost" onClick={() => navigate(-1)}>← NANTI</button>
          </>
        )}
      </div>
    </div>
  );
}
