import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';
import { openExternal } from '../utils/openExternal.js';

const CLAIM_STATUS_LABEL = { pending: 'Menunggu diklaim', claimed: 'Sudah diklaim', expired: 'Kedaluwarsa' };

export default function Profile() {
  const { user, logout, refreshMe } = useAuth();
  const { toast, showToast } = useToast();
  const [daily, setDaily] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    api.get('/rewards/daily/status').then(({ data }) => setDaily(data));
    api.get('/rewards/leaderboard').then(({ data }) => setLeaderboard(data.leaderboard));
    api.get('/roulette/history').then(({ data }) => setClaims(data.claims));
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

      {claims.length > 0 && (
        <>
          <div className="section-title">Riwayat Hadiah Roulette</div>
          {claims.map((c) => (
            <div key={c.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.prizeName}</div>
                  <div style={{ fontSize: 11, color: '#5b7a78' }}>{CLAIM_STATUS_LABEL[c.status] || c.status}</div>
                </div>
                {c.status === 'pending' && (
                  <button className="btn warn" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => openExternal(c.claimUrl)}>
                    Klaim di esportsku.com
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}

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

      {user?.isAdmin && (
        <>
          <div className="section-title">Menu Lainnya</div>
          <Link to="/admin" className="btn secondary block" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 8 }}>
            🛠️ Panel Admin
          </Link>
        </>
      )}

      <button className="btn secondary block" style={{ marginTop: 8 }} onClick={logout}>
        Keluar
      </button>
    </div>
  );
}
