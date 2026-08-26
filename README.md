# Tebak Gambar

Game tebak gambar full-stack dengan sistem manajemen soal, leveling, rewards (koin & XP), dan mode multiplayer realtime — terinspirasi dari aplikasi "Tebak Gambar" populer.

## Fitur

- **Bank soal dinamis** — admin dapat menambah/mengedit/menghapus level (pack) dan soal (kombinasi clue emoji/huruf/gambar + jawaban) lewat panel admin.
- **Kirim Soal** — pemain bisa mengirim soal buatan sendiri; admin meninjau (setujui/tolak) dan pengirim mendapat bonus koin saat disetujui.
- **Leveling** — pemain naik level berdasarkan XP yang terkumpul (kurva XP bertingkat). Level baru membuka pack/level baru yang terkunci.
- **Rewards** — koin & XP didapat dari menjawab benar, reward harian (daily login), dan hasil pertandingan multiplayer. Koin dipakai untuk fitur **Bantuan Huruf** dan **Kunci Jawaban**.
- **Multiplayer realtime** — buat room (dengan kode 5 karakter) atau gabung ke room teman, semua pemain menjawab soal yang sama secara bersamaan dengan batas waktu, skor real-time, dan hadiah koin/XP di akhir pertandingan.

## Struktur Proyek

```
server/   Express + Socket.IO + SQLite (better-sqlite3)
client/   React + Vite (SPA)
```

## Menjalankan Secara Lokal

### 1. Backend

```bash
cd server
npm install
npm run dev      # http://localhost:4000
```

Database SQLite otomatis dibuat & diseed saat pertama kali dijalankan (`server/src/data/tebak-gambar.sqlite`), termasuk akun admin:

- **username:** `admin`
- **password:** `admin123`

### 2. Frontend

```bash
cd client
npm install
npm run dev       # http://localhost:5173
```

Vite dev server sudah dikonfigurasi untuk mem-proxy `/api` dan `/socket.io` ke `http://localhost:4000`, jadi cukup buka `http://localhost:5173`.

## Arsitektur Singkat

- **Auth**: JWT (`/api/auth/register`, `/login`, `/me`). Password di-hash dengan bcrypt.
- **Konten**: `packs` (level/kategori event) berisi banyak `questions` (clue JSON + jawaban). Endpoint CRUD di `/api/packs` dan `/api/questions` (khusus admin).
- **Gameplay**: `/api/game/questions/:id/answer` mengecek jawaban, memberi koin/XP, dan mencatat progres per user. `/api/game/questions/:id/hint` untuk fitur bantuan huruf (parsial) dan kunci jawaban (biaya koin lebih besar, reward berkurang).
- **Rewards**: `/api/rewards/daily/*` untuk klaim harian, `/api/rewards/leaderboard` untuk papan peringkat berbasis XP.
- **Multiplayer**: `server/src/socket/multiplayer.js` mengelola room in-memory (create/join/start/answer/leave), menjalankan 5 ronde soal acak dengan timer, menghitung skor (poin lebih besar untuk jawaban tercepat), dan membagikan koin/XP ke semua pemain di akhir pertandingan berdasarkan peringkat.

## Menambah Soal Baru

Clue direpresentasikan sebagai array objek `{ type: 'emoji' | 'text' | 'image', value: string }`, misalnya:

```json
[
  { "type": "emoji", "value": "🍃" },
  { "type": "text", "value": "B" },
  { "type": "emoji", "value": "🐔" }
]
```

Admin bisa menambahkannya lewat halaman **Admin → Soal**, atau lewat endpoint `POST /api/questions`.
