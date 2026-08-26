import { Router } from 'express';
import db from '../db.js';

const router = Router();

function loadClaim(token) {
  const claim = db.prepare('SELECT * FROM reward_claims WHERE token = ?').get(token);
  if (!claim) return null;
  if (claim.status === 'pending' && new Date(claim.expires_at).getTime() < Date.now()) {
    db.prepare("UPDATE reward_claims SET status = 'expired' WHERE id = ?").run(claim.id);
    claim.status = 'expired';
  }
  return claim;
}

// Public page data for https://tebakgambar.esportsku.com/rewards/id/:token
router.get('/:token', (req, res) => {
  const claim = loadClaim(req.params.token);
  if (!claim) return res.status(404).json({ error: 'Link klaim tidak ditemukan.' });

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(claim.user_id);

  res.json({
    status: claim.status,
    prizeName: claim.prize_name,
    prizeType: claim.prize_type,
    prizeAmount: claim.prize_amount,
    username: user?.username,
    expiresAt: claim.expires_at,
    claimedAt: claim.claimed_at,
  });
});

// Public form submission -- single use, marks the link expired afterwards.
router.post('/:token', (req, res) => {
  const claim = loadClaim(req.params.token);
  if (!claim) return res.status(404).json({ error: 'Link klaim tidak ditemukan.' });
  if (claim.status !== 'pending') {
    return res.status(400).json({ error: 'Link ini sudah diklaim atau sudah kedaluwarsa.' });
  }

  const { nama, idGame, kontak, catatan } = req.body || {};
  if (!nama || !String(nama).trim() || !idGame || !String(idGame).trim() || !kontak || !String(kontak).trim()) {
    return res.status(400).json({ error: 'Nama, ID game, dan kontak wajib diisi.' });
  }

  const formData = {
    nama: String(nama).trim(),
    idGame: String(idGame).trim(),
    kontak: String(kontak).trim(),
    catatan: catatan ? String(catatan).trim() : '',
  };

  db.prepare(
    "UPDATE reward_claims SET status = 'claimed', form_data_json = ?, claimed_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(formData), claim.id);

  res.json({ ok: true, message: 'Klaim berhasil dikirim! Tim esportsku akan memproses hadiahmu segera.' });
});

export default router;
