import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ONB = [
  { clues: ['🍚', '🍳'], title: 'Gambar + kata = jawaban', body: 'Baca petunjuknya, gabungin bunyinya. 🍚 + 🍳 itu NASI GORENG.' },
  { clues: ['💡', '🔓', '🪙'], title: 'Mentok? Ada bantuan', body: 'Buka huruf atau kunci jawaban pakai koin dari tiap soal yang kejawab.' },
  { clues: ['⚔️', '🎡', '💎'], title: 'Duel & gacha hadiah', body: 'Menang dapat tiket roulette — hadiahnya diklaim di esportsku.com.' },
];

function seenIntro() {
  try {
    return localStorage.getItem('tg_intro') === '1';
  } catch {
    return false;
  }
}

export default function Login() {
  const [step, setStep] = useState(() => (seenIntro() ? 'auth' : 'splash'));
  const [slide, setSlide] = useState(0);
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  function toAuth() {
    try {
      localStorage.setItem('tg_intro', '1');
    } catch {
      /* private mode: intro shows again next time, harmless */
    }
    setStep('auth');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await (mode === 'login' ? login(username, password) : register(username, password));
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'splash') {
    return (
      <div className="app-shell">
        <div className="splash">
          <div className="mono accent" style={{ letterSpacing: '.2em' }}>ESPORTSKU / ID</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h1 className="display xl" style={{ color: 'var(--paper)' }}>
              TEBAK<br />
              <span className="accent">GAM</span>
              <span className="hl">BAR</span>
            </h1>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.5, color: 'var(--dim)', maxWidth: 280 }}>
              RIBUAN SOAL GAMBAR + KATA. MAKIN DALEM, MAKIN NAGIH.
            </div>
          </div>
          <button className="btn" onClick={() => setStep('onboarding')}>MULAI ▸</button>
        </div>
      </div>
    );
  }

  if (step === 'onboarding') {
    const s = ONB[slide];
    const last = slide === ONB.length - 1;
    return (
      <div className="app-shell">
        <div className="auth-screen" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mono muted">Cara main</div>
            <button className="btn ghost" onClick={toAuth}>LEWATI ✕</button>
          </div>
          <div key={slide} style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slidein .3s ease both' }}>
            <div className="onb-card">{s.clues.map((c) => <span key={c}>{c}</span>)}</div>
            <h2 className="display" style={{ fontSize: 38, lineHeight: 0.92 }}>{s.title}</h2>
            <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45, color: 'var(--body)', margin: 0, maxWidth: 330 }}>{s.body}</p>
          </div>
          <div className="dots">{ONB.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}</div>
          <button className="btn lg" onClick={() => (last ? toAuth() : setSlide(slide + 1))}>
            {last ? 'GAS MULAI ▸' : 'LANJUT ▸'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="auth-screen">
        <h1 className="display" style={{ fontSize: 44, lineHeight: 0.86 }}>
          {mode === 'login' ? 'Masuk dulu yuk' : 'Bikin akun baru'}
        </h1>
        <div className="mono muted" style={{ fontSize: 11, letterSpacing: '.08em' }}>PROGRES, KOIN &amp; TIKET LU KESIMPEN DI AKUN</div>

        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>MASUK</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>DAFTAR</button>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mis. ajiegg" autoCapitalize="none" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn secondary block" type="submit" disabled={loading} style={{ fontSize: 20 }}>
            {loading ? 'MEMPROSES…' : mode === 'login' ? 'MASUK ▸' : 'DAFTAR ▸'}
          </button>
        </form>
      </div>
    </div>
  );
}
