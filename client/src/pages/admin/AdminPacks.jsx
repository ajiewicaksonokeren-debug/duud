import { useEffect, useState } from 'react';
import api from '../../api.js';

const emptyForm = { name: '', category: 'Level', unlockPlayerLevel: 1, orderIndex: 0 };

export default function AdminPacks({ showToast }) {
  const [packs, setPacks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await api.get('/packs');
    setPacks(data.packs);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, unlockPlayerLevel: p.unlockPlayerLevel, orderIndex: p.orderIndex });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/packs/${editingId}`, form);
        showToast('Pack diperbarui.', 'success');
      } else {
        await api.post('/packs', form);
        showToast('Pack ditambahkan.', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal menyimpan pack.', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus pack ini beserta semua soalnya?')) return;
    await api.delete(`/packs/${id}`);
    showToast('Pack dihapus.', 'success');
    load();
  }

  return (
    <div>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Nama Level/Pack</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="field">
          <label>Kategori</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="Level">Level</option>
            <option value="Event">Event</option>
          </select>
        </div>
        <div className="field">
          <label>Terbuka di Level Pemain</label>
          <input
            type="number"
            min={1}
            value={form.unlockPlayerLevel}
            onChange={(e) => setForm({ ...form, unlockPlayerLevel: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>Urutan Tampil</label>
          <input
            type="number"
            value={form.orderIndex}
            onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn block" type="submit">
            {editingId ? 'Simpan Perubahan' : 'Tambah Pack'}
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
              <th>Nama</th>
              <th>Kategori</th>
              <th>Unlock Lv</th>
              <th>Soal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {packs.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.unlockPlayerLevel}</td>
                <td>{p.totalQuestions}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn secondary" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button className="btn danger" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => handleDelete(p.id)}>
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
