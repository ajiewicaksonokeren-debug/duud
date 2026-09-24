import { useEffect, useState } from 'react';
import api from '../../api.js';
import QuestionCard from '../../components/QuestionCard.jsx';

export default function AdminSubmitted({ showToast }) {
  const [submitted, setSubmitted] = useState([]);
  const [categories, setCategories] = useState([]);
  const [targetCategory, setTargetCategory] = useState({});

  async function load() {
    const [{ data: subData }, { data: categoryData }] = await Promise.all([
      api.get('/questions/submitted'),
      api.get('/categories'),
    ]);
    setSubmitted(subData.submitted);
    setCategories(categoryData.categories);
    setTargetCategory((tc) => {
      const next = { ...tc };
      subData.submitted.forEach((s) => {
        if (!next[s.id]) next[s.id] = categoryData.categories[0]?.id;
      });
      return next;
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id, action) {
    try {
      await api.post(`/questions/submitted/${id}/review`, { action, categoryId: targetCategory[id] });
      showToast(action === 'approve' ? 'Soal disetujui & ditambahkan.' : 'Soal ditolak.', 'success');
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal memproses.', 'error');
    }
  }

  const pending = submitted.filter((s) => s.status === 'pending');

  if (pending.length === 0) return <div className="empty-state">Tidak ada soal kiriman user yang menunggu review.</div>;

  return (
    <div>
      {pending.map((s) => (
        <div key={s.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Dikirim oleh: {s.username}</div>
          <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', marginBottom: -50 }}>
            <QuestionCard clues={s.clues} />
          </div>
          <div style={{ fontWeight: 700, margin: '8px 0' }}>Jawaban: {s.answer}</div>
          <div className="field">
            <label>Masukkan ke kategori</label>
            <select
              value={targetCategory[s.id]}
              onChange={(e) => setTargetCategory({ ...targetCategory, [s.id]: Number(e.target.value) })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn block" onClick={() => review(s.id, 'approve')}>
              ✅ Setujui
            </button>
            <button className="btn danger" onClick={() => review(s.id, 'reject')}>
              ❌ Tolak
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
