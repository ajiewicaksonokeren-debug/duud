import { useEffect, useState } from 'react';
import api from '../../api.js';

const emptyForm = {
  title: '',
  coverImage: '📰',
  excerpt: '',
  content: '',
  category: 'Umum',
  rewardTickets: 1,
  rewardCoins: 15,
  rewardXp: 15,
  hasQuiz: false,
  quizQuestion: '',
  quizChoices: ['', '', ''],
  quizCorrectIndex: 0,
  published: true,
};

export default function AdminArticles({ showToast }) {
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [flagged, setFlagged] = useState([]);

  async function load() {
    const { data } = await api.get('/articles/admin/list');
    setArticles(data.articles);
    const flaggedRes = await api.get('/articles/admin/flagged');
    setFlagged(flaggedRes.data.flagged);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(a) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      coverImage: a.coverImage,
      excerpt: a.excerpt,
      content: a.content,
      category: a.category,
      rewardTickets: a.rewardTickets,
      rewardCoins: a.rewardCoins,
      rewardXp: a.rewardXp,
      hasQuiz: a.hasQuiz,
      quizQuestion: a.quizQuestion || '',
      quizChoices: a.quizChoices || ['', '', ''],
      quizCorrectIndex: a.quizCorrectIndex ?? 0,
      published: a.published,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      title: form.title,
      coverImage: form.coverImage,
      excerpt: form.excerpt,
      content: form.content,
      category: form.category,
      rewardTickets: form.rewardTickets,
      rewardCoins: form.rewardCoins,
      rewardXp: form.rewardXp,
      published: form.published,
      quiz: form.hasQuiz
        ? { question: form.quizQuestion, choices: form.quizChoices.filter(Boolean), correctIndex: form.quizCorrectIndex }
        : { question: null, choices: null, correctIndex: null },
    };
    try {
      if (editingId) {
        await api.put(`/articles/admin/list/${editingId}`, payload);
        showToast('Artikel diperbarui.', 'success');
      } else {
        await api.post('/articles/admin/list', payload);
        showToast('Artikel ditambahkan.', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal menyimpan artikel.', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus artikel ini?')) return;
    await api.delete(`/articles/admin/list/${id}`);
    showToast('Artikel dihapus.', 'success');
    load();
  }

  return (
    <div>
      <form className="card" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ width: 70 }}>
            <label>Icon</label>
            <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Judul</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
        </div>
        <div className="field">
          <label>Kategori</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="field">
          <label>Ringkasan</label>
          <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        </div>
        <div className="field">
          <label>Isi Artikel</label>
          <textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Reward Tiket</label>
            <input type="number" value={form.rewardTickets} onChange={(e) => setForm({ ...form, rewardTickets: Number(e.target.value) })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Reward Koin</label>
            <input type="number" value={form.rewardCoins} onChange={(e) => setForm({ ...form, rewardCoins: Number(e.target.value) })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Reward XP</label>
            <input type="number" value={form.rewardXp} onChange={(e) => setForm({ ...form, rewardXp: Number(e.target.value) })} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12 }}>
          <input type="checkbox" checked={form.hasQuiz} onChange={(e) => setForm({ ...form, hasQuiz: e.target.checked })} />
          Tambahkan kuis anti-cheat (wajib dijawab benar sebelum reward cair)
        </label>

        {form.hasQuiz && (
          <>
            <div className="field">
              <label>Pertanyaan Kuis</label>
              <input value={form.quizQuestion} onChange={(e) => setForm({ ...form, quizQuestion: e.target.value })} />
            </div>
            {form.quizChoices.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <input
                  type="radio"
                  name="correct"
                  checked={form.quizCorrectIndex === i}
                  onChange={() => setForm({ ...form, quizCorrectIndex: i })}
                />
                <input
                  placeholder={`Pilihan ${i + 1}`}
                  value={c}
                  onChange={(e) => {
                    const next = [...form.quizChoices];
                    next[i] = e.target.value;
                    setForm({ ...form, quizChoices: next });
                  }}
                />
              </div>
            ))}
          </>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12 }}>
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Publikasikan
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn block" type="submit">
            {editingId ? 'Simpan Perubahan' : 'Tambah Artikel'}
          </button>
          {editingId && (
            <button type="button" className="btn secondary" onClick={resetForm}>
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: 12 }}>
        {articles.map((a) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontWeight: 700 }}>
                {a.coverImage} {a.title} {!a.published && <span style={{ color: '#ef4444', fontSize: 11 }}>(draft)</span>}
              </div>
              <div style={{ fontSize: 11, color: '#5b7a78' }}>
                {a.category} · +{a.rewardTickets} 🎟️ · {a.hasQuiz ? 'ada kuis' : 'tanpa kuis'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn secondary" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => startEdit(a)}>
                Edit
              </button>
              <button className="btn danger" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => handleDelete(a.id)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {flagged.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>⚠️ Pola Mencurigakan (untuk ditinjau manual)</div>
          {flagged.map((f) => (
            <div key={f.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
              <b>{f.username}</b> menyelesaikan "{f.articleTitle}" — {f.accountsSharingIp} akun berbeda pakai IP yang sama.
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
