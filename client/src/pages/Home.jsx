import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories)).finally(() => setLoading(false));
  }, []);

  function renderCategory(c) {
    const pct = c.totalQuestions ? Math.round((c.solvedCount / c.totalQuestions) * 100) : 0;
    return (
      <div
        key={c.id}
        className={`pack-card ${c.locked ? 'locked' : ''}`}
        onClick={() => !c.locked && navigate(`/category/${c.id}`)}
      >
        {c.locked && <span className="badge">🔒 Lv.{c.unlockPlayerLevel}</span>}
        <div>
          <div style={{ fontSize: 24 }}>{c.icon}</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Level {c.solvedCount}/{c.totalQuestions}
          </div>
        </div>
        <div className="progress-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (loading) return <div className="empty-state">Memuat kategori...</div>;

  return (
    <div>
      <div className="section-title">Pilih Kategori</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: -6 }}>
        Setiap kategori punya ratusan level tebak gambar seputar dunia esports!
      </p>
      <div className="pack-grid">{categories.map(renderCategory)}</div>
    </div>
  );
}
