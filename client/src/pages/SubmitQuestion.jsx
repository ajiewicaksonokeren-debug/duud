import { useState } from 'react';
import api from '../api.js';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast.jsx';
import ClueEditor from '../components/ClueEditor.jsx';
import QuestionCard from '../components/QuestionCard.jsx';

const emptyClue = () => ({ type: 'emoji', value: '' });

export default function SubmitQuestion() {
  const [clues, setClues] = useState([emptyClue(), emptyClue()]);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

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
        Buat soal dari emoji, huruf, atau upload gambar sendiri — gampang, gak perlu coding! Soal yang disetujui
        admin akan tayang dan kamu dapat bonus 25 koin.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Clue</label>
        <ClueEditor clues={clues} onChange={setClues} />

        {clues.some((c) => c.value) && (
          <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', marginBottom: -60 }}>
            <QuestionCard clues={clues} />
          </div>
        )}

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
