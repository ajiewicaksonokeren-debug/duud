import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';

export default function Profile() {
  const { user, logout, refreshMe } = useAuth();
  const { toast, showToast } = useToast();
  const [daily, setDaily] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    api.get('/rewards/daily/status').then(({ data }) => setDaily(data));
    api.get('/rewards/leaderboard').then(({ data }) => setLeaderboard(data.leaderboard));
  }, []);

  async function claimDaily() {
    try {
      const { data } = await api.post('/rewards/daily/claim');
      showToast(`+${data.coinsAwarded} koin, +${data.xpAwarded} xp!`, 'success');
      await refreshMe();
      setDaily((d) => ({ ...d, claimedToday: true }));
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal klaim reward.', 'error');
    }
  }

  return (
    <div>
      <Toast toast={toast} />
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>{user?.avatar}</div>
        <h2 style={{ margin: '6px 0' }}>{user?.username}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '10px 0' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>🪙 {user?.coins}</div>
            <div style={{ fontSize: 11, color: '#5b7a78' }}>Koin</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>⭐ Lv.{user?.playerLevel}</div>
            <div style={{ fontSize: 11, color: '#5b7a78' }}>Level</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>✨ {user?.xp}</div>
            <div style={{ fontSize: 11, color: '#5b7a78' }}>XP</div>
          </div>
        </div>
        <div className="progress-bar" style={{ background: '#e2e8f0' }}>
          <div
            style={{
              width: `${Math.round((user?.xpProgress || 0) * 100)}%`,
              background: 'var(--teal-2)',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#5b7a78', marginTop: 4 }}>
          {user?.xp - user?.xpFloor}/{user?.xpCeiling - user?.xpFloor} xp menuju Lv.{(user?.playerLevel || 1) + 1}
        </div>
      </div>

      <div className="section-title">Reward Harian</div>
      <div className="card">
        <p style={{ marginTop: 0 }}>Klaim koin & XP gratis setiap hari!</p>
        <button className="btn block warn" onClick={claimDaily} disabled={daily?.claimedToday}>
          {daily?.claimedToday ? 'Sudah diklaim hari ini' : `Klaim +${daily?.coins ?? 50} Koin, +${daily?.xp ?? 20} XP`}
        </button>
      </div>

      <div className="section-title">Papan Peringkat</div>
      <div>
        {leaderboard.map((row, i) => (
          <div key={row.username} className="leaderboard-row">
            <span className="rank">#{i + 1}</span>
            <span>{row.avatar}</span>
            <span className="name">{row.username}</span>
            <span style={{ fontWeight: 700 }}>{row.xp} xp</span>
          </div>
        ))}
      </div>

      <button className="btn secondary block" style={{ marginTop: 16 }} onClick={logout}>
        Keluar
      </button>
    </div>
  );
}
