import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useToast } from '../../hooks/useToast.js';
import Toast from '../../components/Toast.jsx';

export default function MultiplayerLobby() {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [packs, setPacks] = useState([]);
  const [packId, setPackId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/packs').then(({ data }) => setPacks(data.packs.filter((p) => !p.locked)));
  }, []);

  function createRoom() {
    if (!socket) return showToast('Menghubungkan ke server...', 'error');
    setBusy(true);
    socket.emit('room:create', { packId: packId || null }, (res) => {
      setBusy(false);
      if (res?.ok) {
        navigate(`/multiplayer/${res.room.code}`);
      } else {
        showToast(res?.error || 'Gagal membuat room.', 'error');
      }
    });
  }

  function joinRoom(e) {
    e.preventDefault();
    if (!socket) return showToast('Menghubungkan ke server...', 'error');
    setBusy(true);
    socket.emit('room:join', { code: joinCode.trim().toUpperCase() }, (res) => {
      setBusy(false);
      if (res?.ok) {
        navigate(`/multiplayer/${res.room.code}`);
      } else {
        showToast(res?.error || 'Gagal bergabung.', 'error');
      }
    });
  }

  return (
    <div>
      <Toast toast={toast} />
      <div className="section-title">Main Bareng Teman</div>
      {!connected && <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Menghubungkan ke server realtime...</p>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>🎮 Buat Room Baru</h3>
        <div className="field">
          <label>Pilih Pack (kosongkan untuk acak)</label>
          <select value={packId} onChange={(e) => setPackId(e.target.value)}>
            <option value="">Acak dari semua pack</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn block" onClick={createRoom} disabled={busy || !connected}>
          Buat Room
        </button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>🔑 Gabung dengan Kode</h3>
        <form className="answer-row" onSubmit={joinRoom}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="masukkan kode room"
            maxLength={5}
            style={{ textTransform: 'uppercase' }}
            required
          />
          <button className="btn" type="submit" disabled={busy || !connected}>
            Gabung
          </button>
        </form>
      </div>
    </div>
  );
}
