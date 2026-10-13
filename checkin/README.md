# CBN Check-in Service

Web app + server check-in harian untuk app CBN fiber. **Tidak ada UI native**: app cuma menyediakan 2 wadah WebView + bridge.
Konten (on/off, judul, gambar, event) diatur di **Strapi**. Poin, streak, dan login tetap di server ini.

```bash
npm install && npm run dev   # http://localhost:4100/demo (wadah app tiruan) · /admin (token "admin")
npm test
```

## Env

| Var | Wajib (prod) | Isi |
|---|---|---|
| `SESSION_SECRET` | ya | Rahasia acak panjang untuk cookie sesi |
| `ADMIN_TOKEN` | ya | Token admin panjang & acak |
| `CBN_EXCHANGE_URL` | ya | `POST` backend CBN `/checkin/session/exchange` |
| `CBN_EXCHANGE_TOKEN` | – | Bearer server-to-server untuk endpoint di atas |
| `STRAPI_URL`, `STRAPI_TOKEN` | – | Strapi + API token **Read-only** (tanpa ini: konten bawaan, tanpa event) |
| `STRAPI_WEBHOOK_TOKEN` | – | Header webhook Strapi → `/hooks/strapi` |
| `INTERNAL_TOKEN` | – | Bearer untuk `GET /api/internal/status/:customerId` |
| `DB_PATH`, `PORT` | – | Default `data/checkin.sqlite`, `4100` |

## Strapi (v4 & v5)

1. Salin `strapi/src/api/*` ke project Strapi Anda → restart. Muncul **Check-in Config** (single type) dan **Check-in Event** (collection).
2. Settings → Users & Permissions → Public: **jangan** buka. Buat API token **Read-only** → `STRAPI_TOKEN`.
3. Settings → Webhooks: URL `https://checkin.cbn.id/hooks/strapi`, header `Authorization: Bearer <STRAPI_WEBHOOK_TOKEN>`, centang entry publish/unpublish/update/delete.
4. Isi Check-in Config → **Publish** (`enabled` default `false`; belum publish = fitur mati).

Sinkron: saat start, tiap 5 menit, dan setiap webhook. Data disalin ke SQLite, jadi kalau Strapi mati, check-in tetap jalan pakai data terakhir.
Event yang tidak valid atau bentrok (lebih dari 1 per tipe di waktu yang sama) diabaikan dan muncul sebagai peringatan di Admin → Event & konten.
`segments` diisi teks dipisah koma (mis. `jakarta, silver`). Kosong = semua user. Dicocokkan dengan `segments` dari exchange.

## Kontrak dengan backend CBN

- `POST /checkin/session` (backend CBN): buat kode sekali pakai, berlaku 60 detik.
- `POST {CBN_EXCHANGE_URL}` `{code}` → `200 {customer_id, name, segments[]}`, kode langsung hangus. Kode tidak valid → 4xx.
- `GET /home/checkin-card` (backend CBN) boleh memanggil `GET /api/internal/status/:customerId` (Bearer `INTERNAL_TOKEN`).
- `min_app_version` dan `rollout_percent` di Strapi dicek oleh app/backend CBN sebelum memasang WebView.

## Wadah WebView di app

| Wadah | URL | Ukuran |
|---|---|---|
| Pop-up Beranda | `{webview_url}?code=…&mode=toast` | Transparan, di bawah status bar, lebar penuh − 24 pt, tinggi awal 64 pt |
| Halaman penuh | `{webview_url}?code=…&mode=page` | Header app "Check-in Harian" + × |

Bridge: Android `addJavascriptInterface(…, "CBNBridge")` (`postMessage(json)`), iOS `userContentController.add(…, "cbn")`.

| Pesan dari web | Aksi app |
|---|---|
| `resize {height}` | Ubah tinggi WebView pop-up |
| `open_full` | Tutup pop-up, buka halaman penuh dengan kode baru |
| `close` | Lepas WebView itu (pop-up tidak perlu tampil, × ditekan, atau "Kembali ke Beranda") |
| `checkin_success {points, claimed_at}` | Tutup pop-up Beranda |
| `haptic {style}` | Getar ringan (opsional) |
| `session_expired` | Muat ulang WebView itu dengan kode baru |

Web app yang memutuskan pop-up tampil (belum klaim, belum ditutup hari ini, fitur & pop-up aktif). Peringkat ada di dalam halaman penuh (`#rank`), tombol back Android kembali ke misi.
