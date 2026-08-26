import { useEffect, useState } from 'react';
import api from '../../api.js';

const STATUS_LABEL = { pending: '⏳ Menunggu', claimed: '✅ Sudah Diklaim', expired: '⌛ Kedaluwarsa' };

export default function AdminClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/roulette/admin/claims')
      .then(({ data }) => setClaims(data.claims))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Memuat klaim...</div>;
  if (claims.length === 0) return <div className="empty-state">Belum ada klaim hadiah roulette.</div>;

  return (
    <div>
      <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
        Daftar hadiah roulette yang perlu diklaim/sudah diklaim lewat esportsku.com. Proses pengiriman diamond/voucher
        dilakukan manual oleh tim esportsku berdasarkan data form di bawah.
      </p>
      {claims.map((c) => (
        <div key={c.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700 }}>
              {c.prizeName} — {c.username}
            </div>
            <div style={{ fontSize: 12 }}>{STATUS_LABEL[c.status] || c.status}</div>
          </div>
          {c.formData && (
            <div style={{ fontSize: 12, color: '#5b7a78', marginTop: 6 }}>
              <div>Nama: {c.formData.nama}</div>
              <div>ID Game: {c.formData.idGame}</div>
              <div>Kontak: {c.formData.kontak}</div>
              {c.formData.catatan && <div>Catatan: {c.formData.catatan}</div>}
            </div>
          )}
          {c.status === 'pending' && (
            <div style={{ fontSize: 11, color: '#5b7a78', marginTop: 6, wordBreak: 'break-all' }}>
              Link klaim: {c.claimUrl}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
