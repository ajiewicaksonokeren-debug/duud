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
      <div className="quick-link-grid">
        <div className="quick-link-card articles" onClick={() => navigate('/artikel')}>
          <div style={{ fontSize: 26 }}>📰</div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Artikel Berhadiah</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Baca, dapat tiket roulette</div>
        </div>
        <div className="quick-link-card esports" onClick={() => navigate('/tebak-skor')}>
          <div style={{ fontSize: 26 }}>🔮</div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Tebak Skor MPL</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Prediksi & menangkan tiket</div>
        </div>
        <div className="quick-link-card multiplayer" onClick={() => navigate('/multiplayer')}>
          <div style={{ fontSize: 26 }}>🎮</div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Multiplayer</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Tantang teman realtime</div>
        </div>
        <div className="quick-link-card submit" onClick={() => navigate('/kirim-soal')}>
          <div style={{ fontSize: 26 }}>📝</div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Kirim Soal</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Buat soal, dapat bonus koin</div>
        </div>
      </div>

      <div className="section-title">Pilih Kategori</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: -6 }}>
        Setiap kategori punya ratusan level tebak gambar seputar dunia esports!
      </p>
      <div className="pack-grid">{categories.map(renderCategory)}</div>
    </div>
  );
}
