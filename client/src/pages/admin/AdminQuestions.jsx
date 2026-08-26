import { useEffect, useState } from 'react';
import api from '../../api.js';
import QuestionCard from '../../components/QuestionCard.jsx';
import ClueEditor from '../../components/ClueEditor.jsx';

const emptyClue = () => ({ type: 'emoji', value: '' });
const emptyForm = () => ({
  categoryId: '',
  clues: [emptyClue(), emptyClue()],
  answer: '',
  difficulty: 1,
  rewardCoins: 10,
  rewardXp: 10,
});

export default function AdminQuestions({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const [{ data: categoryData }, { data: qData }] = await Promise.all([
      api.get('/categories'),
      api.get('/questions'),
    ]);
    setCategories(categoryData.categories);
    setQuestions(qData.questions);
    setForm((f) => (f.categoryId ? f : { ...f, categoryId: categoryData.categories[0]?.id || '' }));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(q) {
    setEditingId(q.id);
    setForm({
      categoryId: q.categoryId,
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

  const filtered = filterCategory
    ? questions.filter((q) => String(q.categoryId) === String(filterCategory))
    : questions;
  const visibleQuestions = filtered.slice(0, 300);

  return (
    <div>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Kategori</label>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700 }}>Clue</label>
        <ClueEditor clues={form.clues} onChange={(clues) => setForm({ ...form, clues })} />

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
            {editingId ? 'Simpan Perubahan' : 'Tambah Soal (Level Baru)'}
          </button>
          {editingId && (
            <button type="button" className="btn secondary" onClick={resetForm}>
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Filter Kategori</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Semua kategori ({questions.length} soal)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12, overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Level</th>
              <th>Jawaban</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleQuestions.map((q) => (
              <tr key={q.id}>
                <td>{categories.find((c) => c.id === q.categoryId)?.name || q.categoryId}</td>
                <td>{q.levelNumber}</td>
                <td>{q.answer}</td>
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
        {filtered.length > visibleQuestions.length && (
          <p style={{ fontSize: 11, color: '#5b7a78', marginTop: 8 }}>
            Menampilkan {visibleQuestions.length} dari {filtered.length} soal. Gunakan filter kategori untuk mempersempit.
          </p>
        )}
      </div>
    </div>
  );
}
