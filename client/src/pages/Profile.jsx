import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { openExternal } from '../utils/openExternal.js';

const CLAIM_STATUS_LABEL = { pending: 'MENUNGGU DIKLAIM', claimed: 'SUDAH DIKLAIM', expired: 'KEDALUWARSA' };

export default function Profile() {
  const { user, logout } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    api.get('/rewards/leaderboard').then(({ data }) => setLeaderboard(data.leaderboard));
    api.get('/roulette/history').then(({ data }) => setClaims(data.claims));
  }, []);

  const rank = leaderboard.findIndex((r) => r.username === user?.username) + 1;
  const stats = [
    { value: (user?.xp ?? 0).toLocaleString('id-ID'), label: 'XP' },
    { value: user?.rouletteTickets ?? 0, label: 'Tiket' },
    { value: rank ? `#${rank}` : '—', label: 'Peringkat' },
  ];

  return (
    <>
      <div className="hero-user">
        <div className="avatar" style={{ width: 76, fontSize: 36 }}>{user?.avatar}</div>
        <div className="body" style={{ padding: 12 }}>
          <div className="display" style={{ fontSize: 26, lineHeight: 0.9 }}>{user?.username}</div>
          <div className="mono muted" style={{ marginTop: 5, letterSpacing: '.08em' }}>
            LEVEL {user?.playerLevel} / {user?.xp - user?.xpFloor} DARI {user?.xpCeiling - user?.xpFloor} XP
          </div>
          <div className="progress accent" style={{ marginTop: 8 }}>
            <div style={{ width: `${Math.round((user?.xpProgress || 0) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="split" style={{ background: 'var(--white)' }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div className="display" style={{ fontSize: 26, lineHeight: 1, letterSpacing: 0 }}>{s.value}</div>
            <div className="mono muted" style={{ fontSize: 9, marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {claims.length > 0 && (
        <div>
          <div className="bar-title">Riwayat klaim hadiah</div>
          <div className="list" style={{ borderTop: 'none' }}>
            {claims.map((c) => (
              <div key={c.id} className="row" style={{ padding: 0, alignItems: 'stretch' }}>
                <div className="grow" style={{ padding: '11px 12px' }}>
                  <div className="display" style={{ fontSize: 14, letterSpacing: 0, lineHeight: 1 }}>{c.prizeName}</div>
                  <div className="mono muted" style={{ marginTop: 3, letterSpacing: 0 }}>{CLAIM_STATUS_LABEL[c.status] || c.status}</div>
                </div>
                {c.status === 'pending' && (
                  <button
                    onClick={() => openExternal(c.claimUrl)}
                    style={{ border: 'none', borderLeft: '3px solid var(--ink)', background: 'var(--orange)', color: 'var(--white)', padding: '0 13px' }}
                    className="mono"
                  >
                    KLAIM ↗
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="bar-title" style={{ marginBottom: 0 }}>Papan peringkat <small>TOP 20 XP</small></div>
        {leaderboard.map((row, i) => (
          <div key={row.username} className={`leaderboard-row ${row.username === user?.username ? 'me' : ''}`}>
            <span className="rank" style={row.username === user?.username ? { color: 'var(--orange)' } : undefined}>{i + 1}</span>
            <span style={{ fontSize: 21 }}>{row.avatar}</span>
            <span className="name ellipsis">{row.username}</span>
            <span className="mono" style={{ fontSize: 12, letterSpacing: 0 }}>{row.xp.toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>

      {user?.isAdmin && (
        <Link to="/admin" className="btn secondary block" style={{ textAlign: 'center', textDecoration: 'none', color: 'var(--yellow)', boxShadow: '5px 5px 0 var(--orange)' }}>
          🛠 PANEL ADMIN (CMS SOAL)
        </Link>
      )}
      <button className="btn ghost block" style={{ padding: 14, fontSize: 12 }} onClick={logout}>KELUAR</button>
    </>
  );
}
