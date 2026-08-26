import { useEffect, useState } from 'react';
import api from '../../api.js';

const emptyForm = {
  league: 'MPL ID',
  teamA: '',
  teamB: '',
  teamALogo: '⚔️',
  teamBLogo: '🛡️',
  bestOf: 3,
  matchTimeLocal: '',
  rewardExactTickets: 5,
  rewardWinnerTickets: 1,
};

export default function AdminEsports({ showToast }) {
  const [matches, setMatches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleScore, setSettleScore] = useState({ scoreA: 0, scoreB: 0 });

  async function load() {
    const { data } = await api.get('/esports/admin/matches');
    setMatches(data.matches);
  }

  useEffect(() => {
    load();
  }, []);

  function toLocalInputValue(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEdit(m) {
    setEditingId(m.id);
    setForm({
      league: m.league,
      teamA: m.teamA,
      teamB: m.teamB,
      teamALogo: m.teamALogo,
      teamBLogo: m.teamBLogo,
      bestOf: m.bestOf,
      matchTimeLocal: toLocalInputValue(m.matchTime),
      rewardExactTickets: m.rewardExactTickets,
      rewardWinnerTickets: m.rewardWinnerTickets,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      league: form.league,
      teamA: form.teamA,
      teamB: form.teamB,
      teamALogo: form.teamALogo,
      teamBLogo: form.teamBLogo,
      bestOf: Number(form.bestOf),
      matchTime: new Date(form.matchTimeLocal).toISOString(),
      rewardExactTickets: Number(form.rewardExactTickets),
      rewardWinnerTickets: Number(form.rewardWinnerTickets),
    };
    try {
      if (editingId) {
        await api.put(`/esports/admin/matches/${editingId}`, payload);
        showToast('Pertandingan diperbarui.', 'success');
      } else {
        await api.post('/esports/admin/matches', payload);
        showToast('Pertandingan ditambahkan.', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal menyimpan pertandingan.', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus pertandingan ini?')) return;
    await api.delete(`/esports/admin/matches/${id}`);
    showToast('Pertandingan dihapus.', 'success');
    load();
  }

  async function handleSettle() {
    try {
      await api.post(`/esports/admin/matches/${settleTarget.id}/settle`, {
        scoreA: Number(settleScore.scoreA),
        scoreB: Number(settleScore.scoreB),
      });
      showToast('Pertandingan disettle, reward sudah dibagikan.', 'success');
      setSettleTarget(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Gagal settle pertandingan.', 'error');
    }
  }

  return (
    <div>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Liga</label>
          <input value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ width: 60 }}>
            <label>Logo A</label>
            <input value={form.teamALogo} onChange={(e) => setForm({ ...form, teamALogo: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Tim A</label>
            <input value={form.teamA} onChange={(e) => setForm({ ...form, teamA: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ width: 60 }}>
            <label>Logo B</label>
            <input value={form.teamBLogo} onChange={(e) => setForm({ ...form, teamBLogo: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Tim B</label>
            <input value={form.teamB} onChange={(e) => setForm({ ...form, teamB: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Best of</label>
            <select value={form.bestOf} onChange={(e) => setForm({ ...form, bestOf: e.target.value })}>
              <option value={1}>Bo1</option>
              <option value={3}>Bo3</option>
              <option value={5}>Bo5</option>
              <option value={7}>Bo7</option>
            </select>
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label>Waktu Pertandingan (terkunci saat ini)</label>
            <input type="datetime-local" value={form.matchTimeLocal} onChange={(e) => setForm({ ...form, matchTimeLocal: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Reward Skor Tepat (🎟️)</label>
            <input type="number" value={form.rewardExactTickets} onChange={(e) => setForm({ ...form, rewardExactTickets: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Reward Pemenang Benar (🎟️)</label>
            <input type="number" value={form.rewardWinnerTickets} onChange={(e) => setForm({ ...form, rewardWinnerTickets: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn block" type="submit">
            {editingId ? 'Simpan Perubahan' : 'Tambah Pertandingan'}
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
              <th>Pertandingan</th>
              <th>Waktu</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.teamALogo} {m.teamA} vs {m.teamB} {m.teamBLogo}
                  {m.settled && (
                    <div style={{ fontWeight: 800 }}>
                      {m.scoreA} - {m.scoreB}
                    </div>
                  )}
                </td>
                <td>{new Date(m.matchTime).toLocaleString('id-ID')}</td>
                <td>{m.settled ? '✅ Selesai' : m.locked ? '🔒 Terkunci' : '⏳ Terbuka'}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {!m.settled && (
                    <button className="btn secondary" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => startEdit(m)}>
                      Edit
                    </button>
                  )}
                  {m.locked && !m.settled && (
                    <button
                      className="btn warn"
                      style={{ padding: '6px 8px', fontSize: 11 }}
                      onClick={() => {
                        setSettleTarget(m);
                        setSettleScore({ scoreA: 0, scoreB: 0 });
                      }}
                    >
                      Settle
                    </button>
                  )}
                  <button className="btn danger" style={{ padding: '6px 8px', fontSize: 11 }} onClick={() => handleDelete(m.id)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {settleTarget && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Settle: {settleTarget.teamA} vs {settleTarget.teamB}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <input
              type="number"
              min={0}
              style={{ width: 60, textAlign: 'center' }}
              value={settleScore.scoreA}
              onChange={(e) => setSettleScore({ ...settleScore, scoreA: e.target.value })}
            />
            <span>:</span>
            <input
              type="number"
              min={0}
              style={{ width: 60, textAlign: 'center' }}
              value={settleScore.scoreB}
              onChange={(e) => setSettleScore({ ...settleScore, scoreB: e.target.value })}
            />
          </div>
          <p style={{ fontSize: 12, color: '#5b7a78' }}>
            Ini akan langsung membagikan tiket/koin/xp ke semua akun yang membuat prediksi, dan tidak bisa dibatalkan.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn block warn" onClick={handleSettle}>
              Konfirmasi Settle
            </button>
            <button className="btn secondary" onClick={() => setSettleTarget(null)}>
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
