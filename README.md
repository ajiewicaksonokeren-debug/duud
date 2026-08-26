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

## Deploy Backend (wajib sebelum build Android)

Aplikasi Android tidak bisa mengakses `localhost` di komputer kamu — backend harus online dengan URL publik dulu. `server/Dockerfile` sudah disiapkan untuk itu.

### Opsi A: Render.com (paling gampang, ada `render.yaml`)

1. Push repo ini ke GitHub (kalau belum).
2. Di Render Dashboard → **New → Blueprint**, pilih repo ini. Render akan otomatis membaca `render.yaml` di root (build dari `server/Dockerfile`, plus disk 1GB untuk database SQLite di `/app/data`).
3. Setelah deploy selesai, catat URL publiknya, misal `https://tebak-gambar-server.onrender.com`.

### Opsi B: Railway / Fly.io / VPS mana pun

Semua platform yang mendukung Dockerfile bisa dipakai:

```bash
cd server
docker build -t tebak-gambar-server .
docker run -d -p 4000:4000 \
  -e JWT_SECRET=ganti-dengan-rahasia-yang-kuat \
  -v tebak-gambar-data:/app/data \
  tebak-gambar-server
```

Set environment variable `JWT_SECRET` ke nilai rahasia sendiri (jangan pakai default dev). Mount volume ke `/app/data` supaya database SQLite tidak hilang saat container di-restart/redeploy.

## Build Aplikasi Android (Capacitor) untuk Play Store

Project Android native sudah discaffold dengan [Capacitor](https://capacitorjs.com) di `client/android/`. Web app di-bundle langsung ke dalam APK (tidak sekadar WebView ke website), lalu app tetap memanggil backend lewat internet untuk data, login, dan multiplayer.

### 1. Arahkan build ke backend yang sudah online

```bash
cd client
cp .env.example .env
# edit .env, isi VITE_API_URL dengan URL backend hasil deploy di atas
```

### 2. Build web assets & sync ke project Android

```bash
npm run cap:sync
```

Perintah ini menjalankan `vite build` lalu menyalin hasilnya ke `android/app/src/main/assets/public`.

### 3. Buka & build di Android Studio

```bash
npm run cap:open
```

Ini membuka `client/android` di Android Studio. Dari sana:

- **Ganti ikon & splash screen** — ikon bawaan Capacitor hanya placeholder. Klik kanan `app/src/main/res` → *New → Image Asset* untuk generate ikon dari logo kamu. Play Store **mewajibkan** ikon custom, tidak boleh pakai ikon default.
- **Update Application ID** kalau perlu, di `android/app/build.gradle` (`applicationId "com.tebakgambar.app"`) — pastikan unik dan sesuai yang didaftarkan di Play Console.
- **Build → Generate Signed Bundle / APK**, pilih **Android App Bundle (.aab)** (format yang diwajibkan Play Store), lalu buat/isi keystore sendiri untuk signing. **Simpan keystore ini baik-baik** — dibutuhkan setiap kali update aplikasi.
- Upload file `.aab` yang dihasilkan ke [Play Console](https://play.google.com/console).

### Setiap kali ada perubahan kode frontend

Ulangi langkah 2 (`npm run cap:sync`) sebelum build ulang di Android Studio, supaya bundle Android memuat versi web terbaru.

### Catatan

- Backend (`server/`) tidak ikut ter-bundle ke APK — dia tetap jalan sebagai layanan terpisah yang online 24/7. Kalau backend down, fitur login/main/multiplayer di app ikut tidak berfungsi.
- Room multiplayer disimpan in-memory di server, jadi kalau butuh scaling ke banyak server sekaligus (load balancer multi-instance), room perlu dipindah ke store bersama (mis. Redis) — untuk kebutuhan saat ini (1 instance) sudah cukup.
