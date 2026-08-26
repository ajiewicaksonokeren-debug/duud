import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';

const STATUS_INFO = {
  claimed: { emoji: '✅', title: 'Sudah Diklaim', text: 'Link ini sudah pernah digunakan untuk klaim hadiah.' },
  expired: { emoji: '⌛', title: 'Kedaluwarsa', text: 'Link klaim ini sudah kedaluwarsa dan tidak bisa dipakai lagi.' },
  notfound: { emoji: '❌', title: 'Link Tidak Valid', text: 'Link klaim ini tidak ditemukan atau salah.' },
};

export default function ClaimPublic() {
  const { token } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nama: '', idGame: '', kontak: '', catatan: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/public/claims/${token}`)
      .then(({ data }) => setClaim(data))
      .catch(() => setClaim({ status: 'notfound' }))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/public/claims/${token}`, form);
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Gagal mengirim klaim.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div style={{ fontSize: 48, textAlign: 'center' }}>🏆</div>
      <h1 style={{ textAlign: 'center' }}>esportsku.com</h1>
      <p className="subtitle">Klaim Hadiah Roulette Tebak Gambar</p>

      <div className="card">
        {loading && <p style={{ textAlign: 'center' }}>Memuat...</p>}

        {!loading && claim?.status && claim.status !== 'pending' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>{STATUS_INFO[claim.status]?.emoji || '❓'}</div>
            <h3>{STATUS_INFO[claim.status]?.title || 'Status Tidak Diketahui'}</h3>
            <p style={{ color: '#5b7a78' }}>{STATUS_INFO[claim.status]?.text}</p>
            {claim.prizeName && <p style={{ fontWeight: 700 }}>Hadiah: {claim.prizeName}</p>}
          </div>
        )}

        {!loading && claim?.status === 'pending' && !submitted && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 44 }}>🎁</div>
              <h3 style={{ margin: '4px 0' }}>Selamat, {claim.username}!</h3>
              <p style={{ fontWeight: 700, color: '#1c2b2a' }}>Kamu memenangkan: {claim.prizeName}</p>
              <p style={{ fontSize: 12, color: '#5b7a78' }}>
                Isi form di bawah untuk klaim hadiahmu. Link ini hanya bisa dipakai satu kali.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nama Lengkap</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
              </div>
              <div className="field">
                <label>ID Game / Username Esports</label>
                <input value={form.idGame} onChange={(e) => setForm({ ...form, idGame: e.target.value })} required />
              </div>
              <div className="field">
                <label>Kontak (WhatsApp/Email)</label>
                <input value={form.kontak} onChange={(e) => setForm({ ...form, kontak: e.target.value })} required />
              </div>
              <div className="field">
                <label>Catatan (opsional)</label>
                <textarea
                  rows={3}
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button className="btn block" type="submit" disabled={submitting}>
                {submitting ? 'Mengirim...' : 'Klaim Hadiah'}
              </button>
            </form>
          </>
        )}

        {submitted && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>🎉</div>
            <h3>Klaim Berhasil Dikirim!</h3>
            <p style={{ color: '#5b7a78' }}>Tim esportsku akan memproses hadiahmu segera. Terima kasih!</p>
          </div>
        )}
      </div>
    </div>
  );
}
