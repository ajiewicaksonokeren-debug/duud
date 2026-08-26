import { useEffect, useRef, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';
import { openExternal } from '../utils/openExternal.js';

const WHEEL_COLORS = ['#17c9be', '#ff8c42', '#ffd23f', '#1fbf8f', '#232946', '#ef4444', '#12a89e', '#a855f7'];

export default function Roulette() {
  const { user, refreshMe } = useAuth();
  const { toast, showToast } = useToast();
  const [prizes, setPrizes] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const spinningPrizeIndex = useRef(0);

  useEffect(() => {
    api.get('/roulette/prizes').then(({ data }) => setPrizes(data.prizes));
  }, []);

  const segAngle = prizes.length ? 360 / prizes.length : 0;

  const gradient = prizes.length
    ? `conic-gradient(${prizes
        .map((p, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * segAngle}deg ${(i + 1) * segAngle}deg`)
        .join(', ')})`
    : '#232946';

  async function handleSpin() {
    if (spinning || !user?.rouletteTickets) return;
    setSpinning(true);
    setResult(null);
    try {
      const { data } = await api.post('/roulette/spin');
      const idx = prizes.findIndex((p) => p.id === data.prize.id);
      const targetIdx = idx === -1 ? 0 : idx;
      const segCenter = targetIdx * segAngle + segAngle / 2;
      const fullSpins = 5 + Math.floor(Math.random() * 3);
      const finalRotation = fullSpins * 360 + (360 - segCenter);

      setRotation((prev) => prev - (prev % 360) + finalRotation);
      spinningPrizeIndex.current = targetIdx;

      setTimeout(() => {
        setSpinning(false);
        setResult(data);
        refreshMe();
      }, 4200);
    } catch (err) {
      setSpinning(false);
      showToast(err?.response?.data?.error || 'Gagal memutar roulette.', 'error');
    }
  }

  return (
    <div>
      <Toast toast={toast} />
      <div className="section-title">🎰 Roulette Hadiah</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: -6 }}>
        Setiap berhasil menjawab soal dengan benar, kamu dapat 1 tiket roulette. Putar untuk memenangkan koin,
        diamond, dan hadiah lainnya!
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 8px', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            fontSize: 28,
          }}
        >
          🔻
        </div>
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: gradient,
            border: '6px solid var(--navy)',
            position: 'relative',
            transition: spinning ? 'transform 4.2s cubic-bezier(0.15, 0.8, 0.15, 1)' : 'none',
            transform: `rotate(${rotation}deg)`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          {prizes.map((p, i) => {
            const angle = (i + 0.5) * segAngle - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 130 + Math.cos(rad) * 90;
            const y = 130 + Math.sin(rad) * 90;
            return (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#1c2b2a',
                  textAlign: 'center',
                  width: 56,
                  lineHeight: 1.15,
                }}
              >
                <div style={{ fontSize: 20 }}>{p.icon}</div>
                {p.name}
              </div>
            );
          })}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'var(--navy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🎰
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span className="stat-pill" style={{ background: 'rgba(255,255,255,0.1)' }}>
          🎟️ {user?.rouletteTickets ?? 0} tiket
        </span>
      </div>

      <button className="btn block warn" onClick={handleSpin} disabled={spinning || !user?.rouletteTickets}>
        {spinning ? 'Memutar...' : !user?.rouletteTickets ? 'Tiket habis' : 'Putar Roulette (1 🎟️)'}
      </button>

      {result && (
        <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>{result.prize.icon}</div>
          <h3 style={{ margin: '4px 0' }}>Selamat! Kamu dapat {result.prize.name}</h3>
          {result.claimUrl ? (
            <>
              <p style={{ fontSize: 13, color: '#5b7a78' }}>
                Hadiah ini perlu diklaim di website esportsku.com. Link ini unik dan hanya berlaku sekali.
              </p>
              <button className="btn block" onClick={() => openExternal(result.claimUrl)}>
                Klaim Sekarang di esportsku.com
              </button>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#5b7a78' }}>Hadiah sudah otomatis masuk ke akunmu.</p>
          )}
        </div>
      )}
    </div>
  );
}
