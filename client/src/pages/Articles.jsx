import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/articles')
      .then(({ data }) => setArticles(data.articles))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Memuat artikel...</div>;

  return (
    <div>
      <div className="section-title">📰 Artikel Berhadiah</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: -6 }}>
        Baca sampai selesai untuk dapat tiket roulette. Beberapa artikel ada kuis singkat di akhir!
      </p>

      {articles.length === 0 && <div className="empty-state">Belum ada artikel.</div>}

      {articles.map((a) => (
        <div key={a.id} className="card article-card" onClick={() => navigate(`/artikel/${a.id}`)}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div className="article-card-cover">{a.coverImage || '📰'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-1)', textTransform: 'uppercase' }}>
                {a.category}
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, margin: '2px 0 4px' }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#5b7a78', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {a.excerpt}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="mini-badge">🎟️ +{a.rewardTickets}</span>
                <span className="mini-badge">🪙 +{a.rewardCoins}</span>
                <span className="mini-badge">⏱️ ~{Math.ceil(a.minReadSeconds / 60) || 1} mnt</span>
                {a.readState === 'completed' && <span className="mini-badge done">✅ Sudah diklaim</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
