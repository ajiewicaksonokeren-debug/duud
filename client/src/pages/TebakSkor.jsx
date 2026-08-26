import { useEffect, useState } from 'react';
import api from '../api.js';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';

const RESULT_LABEL = { exact: '🎯 Skor Tepat!', winner: '✅ Pemenang Benar', wrong: '❌ Meleset' };

function useCountdown(matchTime) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    function tick() {
      const diff = new Date(matchTime).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('Terkunci');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(h > 0 ? `${h}j ${m}m lagi` : m > 0 ? `${m}m ${s}d lagi` : `${s}d lagi`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [matchTime]);
  return label;
}

function MatchCard({ match, onPredict }) {
  const countdown = useCountdown(match.matchTime);
  const [scoreA, setScoreA] = useState(match.myPrediction?.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match.myPrediction?.scoreB ?? 0);
  const [saving, setSaving] = useState(false);
  const maxScore = Math.ceil(match.bestOf / 2);
  const locked = match.locked;

  async function submit() {
    setSaving(true);
    try {
      await onPredict(match.id, scoreA, scoreB);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card match-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#5b7a78', fontWeight: 700 }}>
        <span>
          {match.league} · Bo{match.bestOf}
        </span>
        <span>{match.settled ? 'Selesai' : locked ? '🔒 Terkunci' : `⏳ ${countdown}`}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 32 }}>{match.teamALogo || '🛡️'}</div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{match.teamA}</div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, padding: '0 8px' }}>
          {match.settled ? `${match.scoreA} - ${match.scoreB}` : 'VS'}
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 32 }}>{match.teamBLogo || '🛡️'}</div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{match.teamB}</div>
        </div>
      </div>

      {!locked && !match.settled && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 10 }}>
            <input
              type="number"
              min={0}
              max={maxScore}
              value={scoreA}
              onChange={(e) => setScoreA(Number(e.target.value))}
              style={{ width: 60, textAlign: 'center' }}
            />
            <span style={{ fontWeight: 800 }}>:</span>
            <input
              type="number"
              min={0}
              max={maxScore}
              value={scoreB}
              onChange={(e) => setScoreB(Number(e.target.value))}
              style={{ width: 60, textAlign: 'center' }}
            />
          </div>
          <button className="btn block" onClick={submit} disabled={saving}>
            {saving ? 'Menyimpan...' : match.myPrediction ? 'Ubah Prediksi' : 'Kirim Prediksi'}
          </button>
          <div style={{ fontSize: 11, textAlign: 'center', color: '#5b7a78', marginTop: 6 }}>
            Skor tepat: +{match.rewardExactTickets} 🎟️ · Pemenang benar: +{match.rewardWinnerTickets} 🎟️
          </div>
        </>
      )}

      {(locked || match.settled) && match.myPrediction && (
        <div className="mini-badge" style={{ display: 'block', textAlign: 'center' }}>
          Prediksimu: {match.myPrediction.scoreA} - {match.myPrediction.scoreB}
          {match.myPrediction.result && ` · ${RESULT_LABEL[match.myPrediction.result]}`}
          {match.myPrediction.ticketsAwarded > 0 && ` (+${match.myPrediction.ticketsAwarded} 🎟️)`}
        </div>
      )}

      {locked && !match.settled && !match.myPrediction && (
        <div className="mini-badge" style={{ display: 'block', textAlign: 'center' }}>
          Kamu tidak membuat prediksi untuk pertandingan ini.
        </div>
      )}
    </div>
  );
}

export default function TebakSkor() {
  const { toast, showToast } = useToast();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await api.get('/esports/matches');
    setMatches(data.matches);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handlePredict(matchId, scoreA, scoreB) {
    try {
      await api.post(`/esports/matches/${matchId}/predict`, { scoreA, scoreB });
      showToast('Prediksi tersimpan!', 'success');
      await load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal mengirim prediksi.', 'error');
    }
  }

  if (loading) return <div className="empty-state">Memuat pertandingan...</div>;

  const upcoming = matches.filter((m) => !m.settled);
  const finished = matches.filter((m) => m.settled);

  return (
    <div>
      <Toast toast={toast} />
      <div className="section-title">🔮 Tebak Skor MPL</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: -6 }}>
        Tebak skor pertandingan MPL sebelum kick-off untuk dapat tiket roulette. Prediksi otomatis terkunci begitu
        pertandingan dimulai — tidak bisa diubah lagi setelah itu.
      </p>

      {upcoming.length === 0 && finished.length === 0 && <div className="empty-state">Belum ada jadwal pertandingan.</div>}

      {upcoming.map((m) => (
        <MatchCard key={m.id} match={m} onPredict={handlePredict} />
      ))}

      {finished.length > 0 && (
        <>
          <div className="section-title">Hasil Sebelumnya</div>
          {finished.map((m) => (
            <MatchCard key={m.id} match={m} onPredict={handlePredict} />
          ))}
        </>
      )}
    </div>
  );
}
