import { useEffect, useState } from 'react';
import api from '../../api.js';

const emptyForm = { name: '', icon: '🎮', description: '', unlockPlayerLevel: 1, orderIndex: 0 };

export default function AdminCategories({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await api.get('/categories');
    setCategories(data.categories);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      icon: c.icon,
      description: c.description || '',
      unlockPlayerLevel: c.unlockPlayerLevel,
      orderIndex: c.orderIndex,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form);
        showToast('Kategori diperbarui.', 'success');
      } else {
        await api.post('/categories', form);
        showToast('Kategori ditambahkan.', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal menyimpan kategori.', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus kategori ini beserta semua levelnya?')) return;
    await api.delete(`/categories/${id}`);
    showToast('Kategori dihapus.', 'success');
    load();
  }

  return (
    <div>
      <form className="card" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ width: 70 }}>
            <label>Icon</label>
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Nama Kategori</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
        </div>
        <div className="field">
          <label>Deskripsi</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Terbuka di Level Pemain</label>
            <input
              type="number"
              min={1}
              value={form.unlockPlayerLevel}
              onChange={(e) => setForm({ ...form, unlockPlayerLevel: Number(e.target.value) })}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Urutan Tampil</label>
            <input
              type="number"
              value={form.orderIndex}
              onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn block" type="submit">
            {editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
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
              <th>Kategori</th>
              <th>Unlock Lv</th>
              <th>Level</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.icon} {c.name}
                </td>
                <td>{c.unlockPlayerLevel}</td>
                <td>{c.totalQuestions}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn secondary" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => startEdit(c)}>
                    Edit
                  </button>
                  <button className="btn danger" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => handleDelete(c.id)}>
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
