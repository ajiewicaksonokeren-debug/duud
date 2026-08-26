import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';
import QuestionCard from '../components/QuestionCard.jsx';

export default function Game() {
  const { packId } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const { toast, showToast } = useToast();

  const [pack, setPack] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [masked, setMasked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadPack = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/packs/${packId}/questions`);
      setPack(data.pack);
      setQuestions(data.questions);
      const firstUnsolved = data.questions.findIndex((q) => !q.solved);
      setIndex(firstUnsolved === -1 ? 0 : firstUnsolved);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal memuat soal.', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  useEffect(() => {
    loadPack();
  }, [loadPack]);

  const current = questions[index];

  useEffect(() => {
    setGuess('');
    setMasked(null);
  }, [index]);

  const allSolved = questions.length > 0 && questions.every((q) => q.solved);

  async function handleCheck(e) {
    e.preventDefault();
    if (!current || checking) return;
    setChecking(true);
    try {
      const { data } = await api.post(`/game/questions/${current.id}/answer`, { answer: guess });
      if (data.correct) {
        showToast(`Benar! +${data.coinsAwarded ?? 0} koin, +${data.xpAwarded ?? 0} xp`, 'success');
        await refreshMe();
        setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, solved: true, answer: current.answer || data.answer } : q)));
        setTimeout(() => {
          setIndex((i) => (i + 1 < questions.length ? i + 1 : i));
        }, 700);
      } else {
        showToast('Belum tepat, coba lagi!', 'error');
      }
    } catch (err) {
      showToast(err?.response?.data?.error || 'Terjadi kesalahan.', 'error');
    } finally {
      setChecking(false);
    }
  }

  async function handleHint(type) {
    if (!current) return;
    try {
      const { data } = await api.post(`/game/questions/${current.id}/hint`, { type });
      await refreshMe();
      if (type === 'answer') {
        showToast(`Kunci jawaban: ${data.answer}`, 'info', 4000);
        setGuess(data.answer);
      } else {
        setMasked(data.maskedAnswer);
        showToast(`Bantuan huruf digunakan (-${data.cost} koin)`, 'info');
      }
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal mengambil bantuan.', 'error');
    }
  }

  const maskSlots = useMemo(() => {
    if (!current) return [];
    const source = masked || (current.solved && current.answer ? current.answer : '_'.repeat(current.answerLength));
    return source.split('');
  }, [masked, current]);

  if (loading) return <div className="empty-state">Memuat soal...</div>;
  if (!current) return <div className="empty-state">Belum ada soal di level ini.</div>;

  if (allSolved) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <h2>Level Selesai!</h2>
        <p>Kamu berhasil menyelesaikan semua soal di {pack?.name}.</p>
        <button className="btn block" onClick={() => navigate('/')}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} />
      <div className="tabs">
        <button className="active">{pack?.name}</button>
        <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 12, color: 'var(--text-dim)' }}>
          {index + 1}/{questions.length}
        </span>
      </div>

      <QuestionCard clues={current.clues} />

      <div className="answer-mask">
        {maskSlots.map((ch, i) =>
          ch === ' ' ? (
            <div key={i} style={{ width: 12 }} />
          ) : (
            <div key={i} className="slot">
              {ch === '_' ? '' : ch}
            </div>
          )
        )}
      </div>

      <div className="hint-row">
        <button className="btn warn" type="button" onClick={() => handleHint('letter')} disabled={current.usedLetterHint}>
          💡 Bantuan Huruf
        </button>
        <button className="btn danger" type="button" onClick={() => handleHint('answer')}>
          🔓 Kunci Jawaban
        </button>
      </div>

      <form onSubmit={handleCheck} className="answer-row">
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="isi jawaban"
          autoFocus
        />
        <button className="btn" type="submit" disabled={checking || !guess.trim()}>
          Cek
        </button>
      </form>
    </div>
  );
}
