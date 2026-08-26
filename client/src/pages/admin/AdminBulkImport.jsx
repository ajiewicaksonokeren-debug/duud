import { useEffect, useState } from 'react';
import api from '../../api.js';

const TEMPLATE = `[
  {
    "clues": [{ "type": "emoji", "value": "🏆" }, { "type": "text", "value": "MVP" }],
    "answer": "MOST VALUABLE PLAYER",
    "difficulty": 2,
    "rewardCoins": 15,
    "rewardXp": 15
  },
  {
    "clues": [{ "type": "emoji", "value": "🐍" }],
    "answer": "SNAKE DRAFT",
    "difficulty": 1
  }
]`;

export default function AdminBulkImport({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [jsonText, setJsonText] = useState(TEMPLATE);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      setCategories(data.categories);
      setCategoryId(data.categories[0]?.id || '');
    });
  }, []);

  function validateAndPreview() {
    setError('');
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('Harus berupa array JSON.');
      for (const q of parsed) {
        if (!Array.isArray(q.clues) || q.clues.length === 0) throw new Error('Setiap soal butuh minimal 1 clue.');
        if (!q.answer) throw new Error('Setiap soal butuh jawaban.');
      }
      setPreview(parsed);
      return parsed;
    } catch (err) {
      setError(err.message || 'JSON tidak valid.');
      setPreview(null);
      return null;
    }
  }

  async function handleImport() {
    const parsed = validateAndPreview();
    if (!parsed) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/questions/bulk', { categoryId, questions: parsed });
      showToast(`${data.inserted} soal berhasil diimport sebagai level baru!`, 'success', 3000);
      setPreview(null);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal import soal.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
        Import banyak soal sekaligus (cocok untuk menambah ratusan/ribuan level) dengan paste array JSON. Level akan
        otomatis diurutkan setelah level terakhir yang sudah ada di kategori ini.
      </p>
      <div className="card">
        <div className="field">
          <label>Kategori Tujuan</label>
          <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Data Soal (JSON Array)</label>
          <textarea rows={14} style={{ fontFamily: 'monospace', fontSize: 12 }} value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
        </div>
        {error && <p className="error-text">{error}</p>}
        {preview && (
          <p style={{ fontSize: 12, color: '#1c2b2a', fontWeight: 700 }}>✓ {preview.length} soal siap diimport.</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn secondary" onClick={validateAndPreview}>
            Cek Data
          </button>
          <button type="button" className="btn block" onClick={handleImport} disabled={submitting}>
            {submitting ? 'Mengimport...' : 'Import Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}
