import { useState } from 'react';
import api from '../api.js';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';

const emptyClue = () => ({ type: 'emoji', value: '' });

export default function SubmitQuestion() {
  const [clues, setClues] = useState([emptyClue(), emptyClue()]);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  function updateClue(i, patch) {
    setClues((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function addClue() {
    setClues((cs) => [...cs, emptyClue()]);
  }

  function removeClue(i) {
    setClues((cs) => cs.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/questions/submit', { clues, answer });
      showToast('Soal berhasil dikirim! Terima kasih 🎉', 'success', 3000);
      setClues([emptyClue(), emptyClue()]);
      setAnswer('');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal mengirim soal.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Toast toast={toast} />
      <div className="section-title">Kirim Soal Tebak Gambar</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
        Buat soal dari emoji dan potongan huruf. Soal yang disetujui admin akan tayang dan kamu dapat bonus 25 koin!
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Clue (emoji / huruf)</label>
        {clues.map((c, i) => (
          <div key={i} className="clue-editor-row">
            <select value={c.type} onChange={(e) => updateClue(i, { type: e.target.value })}>
              <option value="emoji">Emoji</option>
              <option value="text">Huruf</option>
              <option value="image">Gambar URL</option>
            </select>
            <input
              value={c.value}
              onChange={(e) => updateClue(i, { value: e.target.value })}
              placeholder={c.type === 'emoji' ? '🐔' : c.type === 'text' ? 'B' : 'https://...'}
              required
            />
            {clues.length > 1 && (
              <button type="button" className="btn danger" style={{ padding: '10px 12px' }} onClick={() => removeClue(i)}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn secondary block" style={{ marginBottom: 12 }} onClick={addClue}>
          + Tambah Clue
        </button>

        <div className="field">
          <label>Jawaban</label>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="contoh: KUNCIR KUDA" required />
        </div>

        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? 'Mengirim...' : 'Kirim Soal'}
        </button>
      </form>
    </div>
  );
}
