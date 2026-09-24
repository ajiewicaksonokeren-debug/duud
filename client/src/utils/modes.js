export const MODES = [
  { id: 'huruf', label: 'Susun Huruf', emoji: '🔤', note: 'Huruf acak, susun sendiri jawabannya' },
  { id: 'pg', label: 'Pilihan Ganda', emoji: '🔢', note: 'Pilih 1 dari 4 jawaban' },
  { id: 'ketik', label: 'Ketik Bebas', emoji: '⌨️', note: 'Tanpa bantuan huruf, ketik langsung' },
  { id: 'puzzle', label: 'Puzzle Buka', emoji: '🧩', note: 'Buka 9 kotak, tebak secepatnya' },
  { id: 'buka', label: 'Buka Pelan', emoji: '⏱️', note: 'Gambar kebuka pelan, cepet-cepetan nebak' },
];

// Never repeats the previous mode, so consecutive questions feel different.
export function rollMode(prev) {
  const pool = MODES.filter((m) => m.id !== prev);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
