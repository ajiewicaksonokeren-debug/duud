# CBN Check-in Service

Layanan check-in harian yang ditempel ke app CBN fiber. Hanya menyimpan `customer_id` (+ nama dari token). Aturan poin, event, dan pop-up diatur di `/admin` tanpa rilis app.

```bash
npm install && npm run dev   # http://localhost:4100/demo  ·  /admin (token "admin")
npm test
```

## Env

| Var | Wajib (prod) | Isi |
|---|---|---|
| `CBN_JWT_PUBLIC_KEY` atau `CBN_JWT_SECRET` | ya | Kunci verifikasi token sesi CBN (RS256/ES256 atau HS256) |
| `CBN_CUSTOMER_CLAIM` | – | Nama claim customer ID, default `customer_id` (fallback `sub`) |
| `CBN_JWT_ISSUER` | – | Kalau diisi, `iss` token wajib sama |
| `ADMIN_TOKEN` | ya | Token admin panjang & acak |
| `DB_PATH`, `PORT` | – | Default `data/checkin.sqlite`, `4100` |

Claim `name` di token dipakai untuk peringkat (tampil "Dian A." ke pelanggan lain, nama lengkap hanya di admin).

## Cara tempel ke app CBN

Semua request: `Authorization: Bearer <token sesi CBN>`.

1. **Beranda selesai dimuat** → `GET /api/checkin/state`. Kalau `showPopup` true **dan** tidak ada pop-up tagihan **dan** onboarding selesai → buka webview transparan penuh `/app?view=sheet&device=android#token=<token>`.
2. **Kartu Beranda** (di bawah Cybro Loyalty): render native dari `state` (`claimed`, `streak`, `todayPoints.total`, `resetAt`, `claimedAt`, `events[0].tag`), atau webview `/app?view=card` (tinggi dari pesan `resize`).
3. **Poin Saya** → webview layar penuh `/app?view=poin`. Peringkat ada di dalamnya (`view=rank`).

Pesan dari webview ke native (React Native `postMessage`, iOS handler `cbnCheckin`, Android interface `CBNCheckin.postMessage`):

| `type` | Native melakukan |
|---|---|
| `close` | Tutup webview |
| `navigate` + `view` | Buka webview `view` itu (`sheet`, `poin`, `rank`) |
| `claimed` + `points`, `streak`, `balance` | Refresh kartu Beranda |
| `resize` + `height` | Atur tinggi webview kartu |
| `unauthorized` | Token kedaluwarsa → refresh token / login |

Token dikirim lewat fragment `#token=` (tidak masuk log server) atau inject `window.CBN_TOKEN` sebelum halaman jalan.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/checkin/state` | Semua data layar |
| POST | `/api/checkin/claim` `{device}` | 200 sukses, 409 sudah klaim hari ini |
| POST | `/api/checkin/dismiss` | "Nanti saja" → pop-up tidak muncul lagi hari ini |
| GET | `/api/checkin/leaderboard?mode=points\|streak` | Top N + posisi sendiri |
| * | `/api/admin/*` | Bearer `ADMIN_TOKEN`: dashboard, rules, events, logs, logs.csv |
