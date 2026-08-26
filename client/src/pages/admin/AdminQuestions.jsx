import { useEffect, useState } from 'react';
import api from '../../api.js';
import QuestionCard from '../../components/QuestionCard.jsx';

const emptyClue = () => ({ type: 'emoji', value: '' });
const emptyForm = () => ({
  packId: '',
  clues: [emptyClue(), emptyClue()],
  answer: '',
  difficulty: 1,
  rewardCoins: 10,
  rewardXp: 10,
});

export default function AdminQuestions({ showToast }) {
  const [packs, setPacks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const [{ data: packData }, { data: qData }] = await Promise.all([
      api.get('/packs'),
      api.get('/questions'),
    ]);
    setPacks(packData.packs);
    setQuestions(qData.questions);
    setForm((f) => (f.packId ? f : { ...f, packId: packData.packs[0]?.id || '' }));
  }

  useEffect(() => {
    load();
  }, []);

  function updateClue(i, patch) {
    setForm((f) => ({ ...f, clues: f.clues.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  }

  function addClue() {
    setForm((f) => ({ ...f, clues: [...f.clues, emptyClue()] }));
  }

  function removeClue(i) {
    setForm((f) => ({ ...f, clues: f.clues.filter((_, idx) => idx !== i) }));
  }

  function startEdit(q) {
    setEditingId(q.id);
    setForm({
      packId: q.packId,
      clues: q.clues,
      answer: q.answer,
      difficulty: q.difficulty,
      rewardCoins: q.rewardCoins,
      rewardXp: q.rewardXp,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/questions/${editingId}`, form);
        showToast('Soal diperbarui.', 'success');
      } else {
        await api.post('/questions', form);
        showToast('Soal ditambahkan.', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal menyimpan soal.', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus soal ini?')) return;
    await api.delete(`/questions/${id}`);
    showToast('Soal dihapus.', 'success');
    load();
  }

  return (
    <div>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Pack</label>
          <select value={form.packId} onChange={(e) => setForm({ ...form, packId: Number(e.target.value) })}>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700 }}>Clue</label>
        {form.clues.map((c, i) => (
          <div key={i} className="clue-editor-row">
            <select value={c.type} onChange={(e) => updateClue(i, { type: e.target.value })}>
              <option value="emoji">Emoji</option>
              <option value="text">Huruf</option>
              <option value="image">Gambar URL</option>
            </select>
            <input value={c.value} onChange={(e) => updateClue(i, { value: e.target.value })} required />
            {form.clues.length > 1 && (
              <button type="button" className="btn danger" style={{ padding: '10px 12px' }} onClick={() => removeClue(i)}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn secondary block" style={{ marginBottom: 12 }} onClick={addClue}>
          + Tambah Clue
        </button>

        {form.clues.some((c) => c.value) && (
          <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', marginBottom: -60 }}>
            <QuestionCard clues={form.clues} />
          </div>
        )}

        <div className="field">
          <label>Jawaban</label>
          <input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Kesulitan (1-3)</label>
            <input
              type="number"
              min={1}
              max={3}
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Reward Koin</label>
            <input
              type="number"
              value={form.rewardCoins}
              onChange={(e) => setForm({ ...form, rewardCoins: Number(e.target.value) })}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Reward XP</label>
            <input
              type="number"
              value={form.rewardXp}
              onChange={(e) => setForm({ ...form, rewardXp: Number(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn block" type="submit">
            {editingId ? 'Simpan Perubahan' : 'Tambah Soal'}
          </button>
          {editingId && (
            <button type="button" className="btn secondary" onClick={resetForm}>
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 12, overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pack</th>
              <th>Jawaban</th>
              <th>Sulit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id}>
                <td>{packs.find((p) => p.id === q.packId)?.name || q.packId}</td>
                <td>{q.answer}</td>
                <td>{q.difficulty}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn secondary" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => startEdit(q)}>
                    Edit
                  </button>
                  <button className="btn danger" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => handleDelete(q.id)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
