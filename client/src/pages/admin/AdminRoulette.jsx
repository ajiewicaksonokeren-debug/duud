import { useEffect, useState } from 'react';
import api from '../../api.js';

const emptyForm = { name: '', icon: '🎁', type: 'coin', amount: 0, weight: 10, requiresClaim: false };

export default function AdminRoulette({ showToast }) {
  const [prizes, setPrizes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await api.get('/roulette/admin/prizes');
    setPrizes(data.prizes);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, icon: p.icon, type: p.type, amount: p.amount, weight: p.weight, requiresClaim: p.requiresClaim });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/roulette/admin/prizes/${editingId}`, form);
        showToast('Hadiah diperbarui.', 'success');
      } else {
        await api.post('/roulette/admin/prizes', form);
        showToast('Hadiah ditambahkan.', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal menyimpan hadiah.', 'error');
    }
  }

  async function toggleActive(p) {
    await api.put(`/roulette/admin/prizes/${p.id}`, { active: !p.active });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Hapus hadiah ini?')) return;
    await api.delete(`/roulette/admin/prizes/${id}`);
    showToast('Hadiah dihapus.', 'success');
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
            <label>Nama Hadiah</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Tipe</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="coin">Koin (langsung masuk)</option>
              <option value="diamond">Diamond (klaim esportsku)</option>
              <option value="voucher">Voucher (klaim esportsku)</option>
              <option value="none">Tidak ada hadiah</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Jumlah</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Bobot (peluang)</label>
            <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={form.requiresClaim}
            onChange={(e) => setForm({ ...form, requiresClaim: e.target.checked })}
          />
          Butuh klaim manual di esportsku.com (untuk diamond/voucher)
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn block" type="submit">
            {editingId ? 'Simpan Perubahan' : 'Tambah Hadiah'}
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
              <th>Hadiah</th>
              <th>Tipe</th>
              <th>Bobot</th>
              <th>Aktif</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {prizes.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.icon} {p.name}
                </td>
                <td>{p.type}</td>
                <td>{p.weight}</td>
                <td>
                  <input type="checkbox" checked={p.active} onChange={() => toggleActive(p)} />
                </td>
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
