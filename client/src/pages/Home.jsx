import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';
import { MODES } from '../utils/modes.js';
import RushTank from '../components/RushTank.jsx';

export default function Home() {
  const { user, refreshMe } = useAuth();
  const { toast, showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories)).finally(() => setLoading(false));
    api.get('/rewards/daily/status').then(({ data }) => setDaily(data));
  }, []);

  async function claimDaily() {
    if (daily?.claimedToday) return showToast('Reward harian udah diambil — balik besok');
    try {
      const { data } = await api.post('/rewards/daily/claim');
      await refreshMe();
      setDaily((d) => ({ ...d, claimedToday: true }));
      showToast(`+${data.coinsAwarded} koin, +${data.xpAwarded} XP`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal klaim reward.', 'error');
    }
  }

  function openCategory(c) {
    if (c.locked) return showToast(`Kebuka di level ${c.unlockPlayerLevel}`);
    navigate(`/category/${c.id}`);
  }

  return (
    <>
      <Toast toast={toast} />
      <div className="hero-user">
        <div className="avatar">{user?.avatar}</div>
        <div className="body">
          <div className="display sm">HALO, {user?.username}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
            <div className="progress accent" style={{ flex: 1, background: 'var(--paper)' }}>
              <div style={{ width: `${Math.round((user?.xpProgress || 0) * 100)}%` }} />
            </div>
            <div className="mono">LV{user?.playerLevel}</div>
          </div>
        </div>
      </div>

      <RushTank user={user} />

      <div className="grid2">
        <button className="tile" onClick={claimDaily}>
          <div className="mono">Harian</div>
          <div>
            <div className="display sm" style={{ fontSize: 22, lineHeight: 0.9 }}>REWARD<br />HARIAN</div>
            <div className="mono" style={{ marginTop: 5, letterSpacing: 0 }}>
              {daily?.claimedToday ? 'SUDAH DIAMBIL' : `+${daily?.coins ?? 50} KOIN · +${daily?.xp ?? 20} XP`}
            </div>
          </div>
        </button>
        <Link to="/roulette" className="tile dark">
          <div className="mono accent">Gacha</div>
          <div>
            <div className="display sm" style={{ fontSize: 22, lineHeight: 0.9 }}>ROU<br />LETTE</div>
            <div className="mono" style={{ marginTop: 5, letterSpacing: 0, color: 'var(--dim)' }}>
              {user?.rouletteTickets ?? 0} TIKET SIAP
            </div>
          </div>
        </Link>
      </div>

      <div>
        <div className="bar-title">Metode diundi <small>GESER →</small></div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--body)', margin: '10px 0 11px' }}>
          Tiap soal diundi salah satu dari 5 cara jawab — nggak bisa dipilih, nggak bisa ditebak.
        </p>
        <div className="hscroll">
          {MODES.map((m) => (
            <div key={m.id} className="mode-card">
              <div style={{ fontSize: 22 }}>{m.emoji}</div>
              <div className="display" style={{ fontSize: 13, lineHeight: 1.05, marginTop: 7, letterSpacing: 0 }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, lineHeight: 1.35, marginTop: 5, color: 'var(--body)' }}>{m.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="bar-title" style={{ marginBottom: 12 }}>Kategori <small>{categories.length} TEMA</small></div>
        {loading ? (
          <div className="empty-state">Memuat kategori...</div>
        ) : (
          <div className="pack-grid">
            {categories.map((c) => {
              const pct = c.totalQuestions ? Math.round((c.solvedCount / c.totalQuestions) * 100) : 0;
              return (
                <button key={c.id} className="pack-card" onClick={() => openCategory(c)}>
                  <div style={{ fontSize: 24 }}>{c.icon}</div>
                  <div>
                    <div className="display" style={{ fontSize: 14, lineHeight: 1.02, letterSpacing: 0 }}>{c.name}</div>
                    <div className="mono" style={{ fontSize: 9, margin: '6px 0 5px', letterSpacing: '.06em' }}>
                      {c.solvedCount}/{c.totalQuestions} LEVEL
                    </div>
                    <div className="progress-bar"><div style={{ width: `${pct}%` }} /></div>
                  </div>
                  {c.locked && (
                    <div className="lock">
                      <div style={{ fontSize: 20 }}>🔒</div>
                      <div className="mono">BUKA LV {c.unlockPlayerLevel}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
