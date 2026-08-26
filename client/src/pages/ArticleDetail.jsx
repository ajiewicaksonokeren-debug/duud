import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const { toast, showToast } = useToast();

  const [article, setArticle] = useState(null);
  const [session, setSession] = useState(null); // { sessionToken, minReadSeconds, hasQuiz, quizQuestion, quizChoices } | 'completed'
  const [elapsed, setElapsed] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reward, setReward] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    api.get(`/articles/${id}`).then(({ data }) => setArticle(data.article));
  }, [id]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    api.post(`/articles/${id}/start`).then(({ data }) => {
      if (data.alreadyCompleted) {
        setSession('completed');
      } else {
        setSession(data);
      }
    });
  }, [id]);

  useEffect(() => {
    if (!session || session === 'completed') return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [session]);

  if (!article) return <div className="empty-state">Memuat artikel...</div>;

  const minSeconds = session && session !== 'completed' ? session.minReadSeconds : article.minReadSeconds;
  const pct = Math.min(100, Math.round((elapsed / minSeconds) * 100));
  const canClaim = session && session !== 'completed' && elapsed >= minSeconds;
  const hasQuiz = session && session !== 'completed' && session.hasQuiz;

  async function handleClaim() {
    if (hasQuiz && quizAnswer === null) {
      showToast('Pilih salah satu jawaban dulu.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/articles/${id}/complete`, {
        sessionToken: session.sessionToken,
        ...(hasQuiz ? { quizAnswerIndex: quizAnswer } : {}),
      });
      setReward(data);
      await refreshMe();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal klaim reward.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Toast toast={toast} />
      <button className="btn secondary" style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12 }} onClick={() => navigate('/artikel')}>
        ← Kembali
      </button>

      <div className="card">
        <div style={{ fontSize: 48, textAlign: 'center' }}>{article.coverImage || '📰'}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-1)', textTransform: 'uppercase', textAlign: 'center' }}>
          {article.category}
        </div>
        <h2 style={{ margin: '4px 0 12px', textAlign: 'center' }}>{article.title}</h2>
        <p style={{ lineHeight: 1.7, color: '#2b3a39', whiteSpace: 'pre-wrap' }}>{article.content}</p>
      </div>

      {(session === 'completed' || article.readState === 'completed') && !reward && (
        <div className="card" style={{ marginTop: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 32 }}>✅</div>
          <p style={{ margin: '4px 0 0', fontWeight: 700 }}>Reward artikel ini sudah pernah kamu klaim.</p>
        </div>
      )}

      {reward && (
        <div className="card" style={{ marginTop: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <h3 style={{ margin: '4px 0' }}>Reward diterima!</h3>
          <p style={{ fontSize: 13, color: '#5b7a78' }}>
            +{reward.ticketsAwarded} 🎟️ tiket, +{reward.coinsAwarded} 🪙 koin, +{reward.xpAwarded} ✨ xp
          </p>
          <button className="btn block warn" onClick={() => navigate('/roulette')}>
            Putar Roulette Sekarang
          </button>
        </div>
      )}

      {session && session !== 'completed' && !reward && (
        <div className="card" style={{ marginTop: 12 }}>
          {!canClaim && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#5b7a78' }}>
                Baca dulu sampai selesai... ({Math.max(0, minSeconds - elapsed)}s lagi)
              </div>
              <div className="progress-bar" style={{ background: '#e2e8f0' }}>
                <div style={{ width: `${pct}%`, background: 'var(--teal-2)' }} />
              </div>
            </>
          )}

          {canClaim && hasQuiz && (
            <>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>🧠 {session.quizQuestion}</div>
              {session.quizChoices.map((choice, i) => (
                <label
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: quizAnswer === i ? '#d9f5ea' : '#f3f6f6',
                    marginBottom: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  <input type="radio" name="quiz" checked={quizAnswer === i} onChange={() => setQuizAnswer(i)} />
                  {choice}
                </label>
              ))}
              <button className="btn block warn" onClick={handleClaim} disabled={submitting || quizAnswer === null}>
                {submitting ? 'Mengirim...' : 'Kirim Jawaban & Klaim Reward'}
              </button>
            </>
          )}

          {canClaim && !hasQuiz && (
            <button className="btn block warn" onClick={handleClaim} disabled={submitting}>
              {submitting ? 'Mengklaim...' : `Klaim Reward (+${article.rewardTickets} 🎟️)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
