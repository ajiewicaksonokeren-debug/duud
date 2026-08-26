# Tebak Gambar Esports

Game tebak gambar bertema esports, full-stack, dengan CMS tanpa-coding untuk mengelola soal, 10+ kategori dengan ratusan/ribuan level per kategori, sistem leveling & rewards (koin, XP, tiket roulette), roulette gacha dengan hadiah diamond/voucher yang diklaim lewat website eksternal esportsku.com, dan mode multiplayer realtime.

## Fitur

- **CMS tanpa coding** — panel Admin (web app) untuk menambah/mengedit/menghapus kategori & soal, termasuk **upload gambar langsung dari komputer** (tidak perlu isi URL manual) dan **import massal** ratusan/ribuan soal sekaligus lewat paste JSON.
- **10+ kategori esports** — Mobile Legends, PUBG Mobile, Free Fire, Valorant, Dota 2, Counter-Strike, League of Legends, Atlet Esports, Tim & Organisasi, Turnamen & Event, Sejarah Esports, Istilah Gaming, dst. Admin bebas menambah kategori baru kapan saja.
- **Level tak terbatas per kategori** — tiap kategori adalah rangkaian level bernomor urut (Level 1, 2, 3, ... bisa sampai 5000+) yang dibuka satu per satu; jumlahnya murni tergantung berapa banyak soal yang ditambahkan admin (lewat form biasa atau import massal).
- **Kirim Soal** — pemain bisa mengirim soal buatan sendiri (termasuk upload gambar sendiri); admin meninjau (setujui/tolak) dan pengirim mendapat bonus koin saat disetujui.
- **Leveling pemain** — XP dari menjawab benar menentukan level pemain, yang membuka kategori-kategori baru yang terkunci.
- **Rewards** — koin & XP didapat dari menjawab benar, reward harian, dan hasil pertandingan multiplayer. Koin dipakai untuk **Bantuan Huruf** dan **Kunci Jawaban**.
- **Roulette Tiket** — setiap berhasil menjawab soal (atau menang multiplayer) memberi 1+ tiket roulette. Tiket dipakai untuk memutar roulette hadiah (koin instan, atau diamond/voucher).
- **Klaim hadiah via esportsku.com** — hadiah diamond/voucher tidak langsung masuk otomatis; setiap kemenangan menghasilkan link klaim unik & sekali-pakai (`https://tebakgambar.esportsku.com/rewards/id/<token>`) yang **dibuka lewat browser bawaan sistem di dalam app (Custom Tabs), bukan WebView**, tempat pemenang mengisi form data diri untuk diproses manual oleh tim esportsku. Link otomatis kedaluwarsa setelah dipakai/lewat 7 hari.
- **Multiplayer realtime** — buat room (kode 5 karakter) atau gabung ke room teman, semua pemain menjawab soal yang sama secara bersamaan dengan batas waktu, skor real-time, dan hadiah koin/XP/tiket di akhir pertandingan.

## Struktur Proyek

```
server/   Express + Socket.IO + SQLite (better-sqlite3) + upload gambar (multer)
client/   React + Vite (SPA) + Capacitor (Android) + Capacitor Browser (Custom Tabs)
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
- **Konten**: `categories` (10+ tema esports) berisi banyak `questions`, masing-masing punya `level_number` urut di dalam kategorinya (inilah "Level 1, 2, 3, ... 5000+" yang dilihat pemain). CRUD di `/api/categories` dan `/api/questions` (khusus admin), plus `POST /api/questions/bulk` untuk import massal.
- **Upload gambar**: `POST /api/uploads` (multer, disimpan di disk, disajikan lewat `/uploads/<file>`) dipakai oleh clue bertipe `image` di form Admin maupun Kirim Soal — tinggal pilih file, tidak perlu tahu URL.
- **Gameplay**: `/api/game/questions/:id/answer` mengecek jawaban, memberi koin/XP/1 tiket roulette, dan mencatat progres per user. `/api/game/questions/:id/hint` untuk bantuan huruf (parsial) dan kunci jawaban (reward berkurang).
- **Rewards**: `/api/rewards/daily/*` untuk klaim harian, `/api/rewards/leaderboard` untuk papan peringkat berbasis XP.
- **Roulette**: `/api/roulette/spin` mengundi hadiah secara weighted-random dari `roulette_prizes` (dikelola admin di `/api/roulette/admin/prizes`). Hadiah `coin` langsung masuk saldo; hadiah `diamond`/`voucher` (`requiresClaim: true`) membuat baris `reward_claims` dengan token unik & link klaim.
- **Klaim publik**: `/api/public/claims/:token` (tanpa login) — dipakai oleh halaman `/rewards/id/:token` yang dibuka lewat Custom Tabs. Sekali form dikirim, token langsung berstatus `claimed` dan tidak bisa dipakai lagi.
- **Multiplayer**: `server/src/socket/multiplayer.js` mengelola room in-memory (create/join/start/answer/leave), menjalankan 5 ronde soal acak dengan timer, menghitung skor (poin lebih besar untuk jawaban tercepat), dan membagikan koin/XP/tiket ke semua pemain di akhir pertandingan berdasarkan peringkat.

## Menambah Soal & Kategori Baru (tanpa coding)

Semuanya bisa dilakukan lewat halaman **Admin** di dalam app (role admin), tidak perlu sentuh kode:

- **Admin → Kategori**: tambah kategori baru (nama, icon emoji, level pemain minimal untuk buka kategori ini).
- **Admin → Soal**: tambah satu soal ke kategori tertentu — clue bisa berupa emoji, teks, atau **upload gambar langsung** (tombol "Upload Gambar" pada tipe clue Gambar). Level number otomatis lanjut dari level terakhir di kategori itu.
- **Admin → Import Massal**: cocok untuk menambah banyak level sekaligus (misal 500 soal dalam satu kali import) dengan paste array JSON, format:

```json
[
  { "clues": [{ "type": "emoji", "value": "🏆" }, { "type": "text", "value": "MVP" }], "answer": "MOST VALUABLE PLAYER" },
  { "clues": [{ "type": "image", "value": "/uploads/nama-file.jpg" }], "answer": "JAWABAN LAIN" }
]
```

- **Admin → Roulette**: atur daftar hadiah roulette (nama, icon, tipe koin/diamond/voucher, jumlah, bobot peluang, dan apakah butuh klaim manual).
- **Admin → Klaim Hadiah**: lihat semua klaim hadiah yang masuk (data form pemenang: nama, ID game, kontak) untuk diproses tim esportsku.

## Deploy Backend (wajib sebelum build Android)

Aplikasi Android tidak bisa mengakses `localhost` di komputer kamu — backend harus online dengan URL publik dulu. `server/Dockerfile` sudah disiapkan untuk itu.

Environment variables penting:

| Variable | Wajib? | Keterangan |
|---|---|---|
| `JWT_SECRET` | ✅ | Rahasia untuk sign token login. Jangan pakai default dev di production. |
| `DB_PATH` | disarankan | Lokasi file SQLite, mis. `/app/data/tebak-gambar.sqlite`. Folder gambar upload otomatis dibuat di sebelahnya (`/app/data/uploads`) — mount volume di path ini agar database **dan** gambar upload sama-sama persist. |
| `CLAIM_BASE_URL` | ✅ untuk fitur roulette | Base URL halaman klaim hadiah, tanpa trailing slash. Set ini ke domain/subdomain esportsku, mis. `https://tebakgambar.esportsku.com` — link yang dibagikan ke pemenang roulette akan berbentuk `${CLAIM_BASE_URL}/rewards/id/<token>`. Kalau belum di-set, default-nya `http://localhost:5173` (hanya untuk dev). |

### Opsi A: Render.com (paling gampang, ada `render.yaml`)

1. Push repo ini ke GitHub (kalau belum).
2. Di Render Dashboard → **New → Blueprint**, pilih repo ini. Render akan otomatis membaca `render.yaml` di root (build dari `server/Dockerfile`, plus disk 1GB di `/app/data` untuk database SQLite dan gambar upload).
3. Tambahkan environment variable `CLAIM_BASE_URL` sesuai domain klaim hadiahmu.
4. Setelah deploy selesai, catat URL publiknya, misal `https://tebak-gambar-server.onrender.com`.

### Opsi B: Railway / Fly.io / VPS mana pun

Semua platform yang mendukung Dockerfile bisa dipakai:

```bash
cd server
docker build -t tebak-gambar-server .
docker run -d -p 4000:4000 \
  -e JWT_SECRET=ganti-dengan-rahasia-yang-kuat \
  -e CLAIM_BASE_URL=https://tebakgambar.esportsku.com \
  -v tebak-gambar-data:/app/data \
  tebak-gambar-server
```

Mount volume ke `/app/data` supaya database SQLite **dan** gambar upload tidak hilang saat container di-restart/redeploy.

### Menghubungkan subdomain esportsku ke halaman klaim

Halaman klaim (`/rewards/id/:token`) adalah bagian dari SPA React yang sama (`client/`), bukan layanan terpisah. Supaya link `https://tebakgambar.esportsku.com/rewards/id/XXX` benar-benar terbuka, arahkan DNS/reverse-proxy subdomain `tebakgambar.esportsku.com` ke hasil build `client/` (di-hosting statis, mis. Vercel/Netlify/Nginx) yang **sudah** dikonfigurasi dengan `VITE_API_URL` menunjuk ke backend yang sama, lalu set `CLAIM_BASE_URL` di backend ke domain itu. Halaman ini tidak butuh login — aman diakses dari browser mana pun.

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

- Backend (`server/`) tidak ikut ter-bundle ke APK — dia tetap jalan sebagai layanan terpisah yang online 24/7. Kalau backend down, fitur login/main/multiplayer/roulette di app ikut tidak berfungsi.
- Room multiplayer disimpan in-memory di server, jadi kalau butuh scaling ke banyak server sekaligus (load balancer multi-instance), room perlu dipindah ke store bersama (mis. Redis) — untuk kebutuhan saat ini (1 instance) sudah cukup.

### Klaim hadiah dibuka lewat Custom Tabs, bukan WebView

Sesuai kebutuhan, link klaim hadiah **tidak pernah** dibuka sebagai halaman di dalam app (WebView/iframe). Tombol "Klaim Sekarang di esportsku.com" (di halaman Roulette maupun riwayat klaim di Profil) memanggil `Browser.open()` dari paket [`@capacitor/browser`](https://capacitorjs.com/docs/apis/browser), yang di Android membuka **Chrome Custom Tabs** — jendela browser sistem sungguhan yang muncul di atas app, lengkap dengan address bar, bukan komponen web di dalam app. Di web (mode dev), plugin ini otomatis fallback ke tab baru biasa.
