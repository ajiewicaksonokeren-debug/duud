import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function Home() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/packs').then(({ data }) => setPacks(data.packs)).finally(() => setLoading(false));
  }, []);

  const levels = packs.filter((p) => p.category === 'Level');
  const events = packs.filter((p) => p.category !== 'Level');

  function renderPack(p) {
    const pct = p.totalQuestions ? Math.round((p.solvedCount / p.totalQuestions) * 100) : 0;
    return (
      <div
        key={p.id}
        className={`pack-card ${p.locked ? 'locked' : ''}`}
        onClick={() => !p.locked && navigate(`/pack/${p.id}`)}
      >
        {p.locked && <span className="badge">🔒 Lv.{p.unlockPlayerLevel}</span>}
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{p.name}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {p.solvedCount}/{p.totalQuestions} soal
          </div>
        </div>
        <div className="progress-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (loading) return <div className="empty-state">Memuat level...</div>;

  return (
    <div>
      <div className="section-title">Level</div>
      <div className="pack-grid">{levels.map(renderPack)}</div>

      {events.length > 0 && (
        <>
          <div className="section-title">Soal Event</div>
          <div className="pack-grid">{events.map(renderPack)}</div>
        </>
      )}
    </div>
  );
}
