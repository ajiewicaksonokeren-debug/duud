import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import { rollMode, shuffle } from '../utils/modes.js';

const CONFETTI = ['#0d0d0d', '#ffe000', '#f5f2e8'];

function freshRound(q, prevMode) {
  return {
    mode: rollMode(prevMode),
    slots: Array((q.wordLengths || []).reduce((a, n) => a + n, 0)).fill(null),
    pool: (q.letters || []).map((ch) => ({ ch, used: false })),
    options: shuffle(q.options || []),
    typed: '',
    covers: Array(9).fill(false),
    reveal: 0,
  };
}

export default function Game() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const { toast, showToast } = useToast();

  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(null);
  const [win, setWin] = useState(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const current = questions[index];

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/categories/${categoryId}/questions`);
      setCategory(data.category);
      setQuestions(data.questions);
      const firstUnsolved = data.questions.findIndex((q) => !q.solved);
      setIndex(firstUnsolved === -1 ? 0 : firstUnsolved);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal memuat soal.', 'error');
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (current && !current.solved) setRound((r) => freshRound(current, r?.mode.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // "Buka pelan": the clue slowly un-blurs while the player is still guessing.
  useEffect(() => {
    if (!playing || win || round?.mode.id !== 'buka' || round.reveal >= 100) return;
    const t = setTimeout(() => setRound((r) => ({ ...r, reveal: Math.min(100, r.reveal + 2) })), 200);
    return () => clearTimeout(t);
  }, [playing, win, round]);

  async function submit(text) {
    if (!current || busy || !text.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/game/questions/${current.id}/answer`, { answer: text });
      if (data.correct) {
        await refreshMe();
        setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, solved: true, answer: data.answer } : q)));
        setWin(data);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 450);
        showToast('Belum tepat — coba lagi', 'error');
      }
    } catch (err) {
      showToast(err?.response?.data?.error || 'Terjadi kesalahan.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function place(slots, pool, at, ch) {
    const hit = pool.findIndex((p) => !p.used && p.ch === ch);
    if (hit < 0) return;
    pool[hit] = { ...pool[hit], used: true };
    slots[at] = { ch, from: hit };
  }

  function pick(i) {
    const slots = round.slots.slice();
    const pool = round.pool.slice();
    const at = slots.indexOf(null);
    if (at < 0 || pool[i].used) return;
    pool[i] = { ...pool[i], used: true };
    slots[at] = { ch: pool[i].ch, from: i };
    setRound({ ...round, slots, pool });
    if (!slots.includes(null)) submit(joinWords(slots));
  }

  function unpick(at) {
    const s = round.slots[at];
    if (!s) return;
    const slots = round.slots.slice();
    const pool = round.pool.slice();
    pool[s.from] = { ...pool[s.from], used: false };
    slots[at] = null;
    setRound({ ...round, slots, pool });
  }

  function joinWords(slots) {
    let k = 0;
    return current.wordLengths.map((n) => slots.slice(k, (k += n)).map((s) => s?.ch || '').join('')).join(' ');
  }

  async function hint(type) {
    try {
      const { data } = await api.post(`/game/questions/${current.id}/hint`, { type });
      await refreshMe();
      if (type === 'answer') return submit(data.answer);
      const shown = data.maskedAnswer.replace(/\s/g, '').split('').filter((c) => c !== '_');
      setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, usedLetterHint: true } : q)));
      if (round.mode.id === 'huruf') {
        const slots = round.slots.slice();
        const pool = round.pool.slice();
        shown.forEach((ch, at) => {
          if (slots[at]?.ch === ch) return;
          if (slots[at]) pool[slots[at].from] = { ...pool[slots[at].from], used: false };
          slots[at] = null;
          place(slots, pool, at, ch);
        });
        setRound({ ...round, slots, pool });
      } else {
        setRound({ ...round, typed: shown.join('') });
      }
      showToast(`Dibuka: ${data.maskedAnswer} (−${data.cost} koin)`);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal mengambil bantuan.', 'error');
    }
  }

  function next() {
    setWin(null);
    const nextIdx = questions.findIndex((q, i) => i > index && !q.solved);
    if (nextIdx === -1) {
      setPlaying(false);
      return;
    }
    setIndex(nextIdx);
  }

  function share() {
    const text = `Bisa tebak soal Level ${current.levelNumber} ${category.name} di Tebak Gambar?`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => showToast('Teks ajakan disalin'));
  }

  if (!category) return <div className="empty-state">Memuat soal...</div>;
  if (!questions.length) return <div className="empty-state">Belum ada soal di kategori ini.</div>;

  const solvedCount = questions.filter((q) => q.solved).length;
  const allSolved = solvedCount === questions.length;

  if (!playing || allSolved) {
    const pct = Math.round((solvedCount / questions.length) * 100);
    return (
      <>
        <Toast toast={toast} />
        <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>
          ← KATEGORI
        </button>
        <div className="card" style={{ background: 'var(--orange)', color: 'var(--paper)', boxShadow: '7px 7px 0 var(--ink)', gap: 0 }}>
          <div style={{ fontSize: 30 }}>{category.icon}</div>
          <div className="display md" style={{ marginTop: 6 }}>{category.name}</div>
          <div className="mono" style={{ fontSize: 11, marginTop: 7, letterSpacing: '.04em' }}>
            {solvedCount} DARI {questions.length} LEVEL{allSolved ? ' / TAMAT!' : ` / LANJUT LV ${questions[index].levelNumber}`}
          </div>
          <div className="progress" style={{ marginTop: 11 }}><div style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="level-grid">
          {questions.map((q, i) => {
            const cur = i === index && !q.solved;
            return (
              <button
                key={q.id}
                className={q.solved ? 'done' : cur ? 'cur' : ''}
                onClick={() => {
                  if (q.solved) return showToast(`Jawaban: ${q.answer}`);
                  setIndex(i);
                  setPlaying(true);
                }}
              >
                <div>{q.levelNumber}</div>
                <small>{q.solved ? '★' : cur ? '▶' : '·'}</small>
              </button>
            );
          })}
        </div>
        {!allSolved && (
          <button className="btn lg" onClick={() => setPlaying(true)}>
            MAIN LEVEL {questions[index].levelNumber} ▸
          </button>
        )}
      </>
    );
  }

  if (!round) return null;
  const mode = round.mode.id;
  const typing = mode === 'ketik' || mode === 'puzzle' || mode === 'buka';
  let k = 0;
  const words = current.wordLengths.map((n) => Array.from({ length: n }, () => k++));

  return (
    <>
      <Toast toast={toast} />
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
        <button className="btn ghost" style={{ width: 42, padding: 0, fontFamily: 'var(--display)', fontSize: 16 }} onClick={() => setPlaying(false)}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display sm">LEVEL {current.levelNumber}</div>
          <div className="mono muted ellipsis" style={{ marginTop: 3, letterSpacing: '.1em' }}>{category.name}</div>
        </div>
      </div>

      <div className="mode-strip">
        <div className="emoji" key={current.id}>{round.mode.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono accent" style={{ fontSize: 9, letterSpacing: '.16em' }}>Metode diundi</div>
          <div className="display" style={{ fontSize: 16, letterSpacing: 0, marginTop: 3, lineHeight: 1 }}>{round.mode.label}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>{round.mode.note}</div>
        </div>
      </div>

      <QuestionCard
        clues={current.clues}
        shake={shake}
        blur={mode === 'buka' ? Math.round((100 - round.reveal) / 9) : 0}
      >
        {mode === 'puzzle' && (
          <div className="covers">
            {round.covers.map((open, i) => (
              <button
                key={i}
                className={open ? 'open' : ''}
                onClick={() => setRound({ ...round, covers: round.covers.map((c, j) => c || j === i) })}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
        {mode === 'buka' && (
          <div className="reveal"><div style={{ width: `${round.reveal}%` }} /></div>
        )}
      </QuestionCard>

      {mode === 'huruf' && (
        <>
          <div className="answer-mask">
            {words.map((idxs, wi) => (
              <div key={wi} className="word">
                {idxs.map((at) => (
                  <button key={at} className={`slot ${round.slots[at] ? 'filled' : ''}`} onClick={() => unpick(at)}>
                    {round.slots[at]?.ch}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="letter-pool">
            {round.pool.map((t, i) => (
              <button key={i} disabled={t.used} onClick={() => pick(i)}>{t.ch}</button>
            ))}
          </div>
        </>
      )}

      {mode === 'pg' && (
        <div className="options">
          {round.options.map((o) => (
            <button key={o} onClick={() => submit(o)} disabled={busy}>{o}</button>
          ))}
        </div>
      )}

      {typing && (
        <form className="answer-row" onSubmit={(e) => { e.preventDefault(); submit(round.typed); }}>
          <input
            value={round.typed}
            onChange={(e) => setRound({ ...round, typed: e.target.value })}
            placeholder="ISI JAWABAN"
            autoFocus
          />
          <button className="btn" type="submit" disabled={busy || !round.typed.trim()}>CEK</button>
        </form>
      )}

      <div className="hint-row">
        <button className="btn warn" onClick={() => hint('letter')} disabled={current.usedLetterHint}>
          BANTUAN<br />HURUF<br />15 🪙
        </button>
        <button className="btn secondary" onClick={() => hint('answer')}>
          KUNCI<br />JAWABAN<br />40 🪙
        </button>
        <button className="btn ghost" style={{ flex: 'none', fontFamily: 'var(--display)', fontSize: 15 }} onClick={share}>↗</button>
      </div>

      {win && (
        <div className="win">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${(i * 97) % 100}%`,
                width: 7 + (i % 3) * 5,
                height: 7 + (i % 3) * 5,
                background: CONFETTI[i % 3],
                animationDelay: `${(i % 6) * 0.08}s`,
              }}
            />
          ))}
          <div className="display" style={{ fontSize: 62, lineHeight: 0.82, animation: 'pop .28s ease both' }}>MAN<br />TAP!</div>
          <div className="display" style={{ background: 'var(--ink)', color: 'var(--yellow)', padding: '13px 20px', fontSize: 22, letterSpacing: '.02em', lineHeight: 1 }}>
            {win.answer}
          </div>
          <div className="split mono" style={{ fontSize: 12, letterSpacing: 0 }}>
            <div>+{win.coinsAwarded ?? 0} KOIN</div>
            <div>+{win.xpAwarded ?? 0} XP</div>
            <div>+{win.ticketsAwarded ?? 0} TIKET</div>
          </div>
          <button className="btn" onClick={next}>LANJUT ▸</button>
        </div>
      )}
    </>
  );
}
