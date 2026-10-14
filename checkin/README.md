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

## Peta route

**Server (`src/index.js`)**

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| POST | `/api/session` `{code}` | – | Tukar kode sekali pakai → cookie `cbn_checkin` (12 jam) |
| GET | `/api/checkin/state` | cookie | Semua data layar (poin hari ini, 7 hari, event, saldo, peringkat, riwayat) |
| POST | `/api/checkin/claim` `{device}` | cookie | 200 sukses · 409 sudah klaim hari ini · 403 fitur mati |
| POST | `/api/checkin/dismiss` | cookie | "×" di pop-up → tidak tampil lagi hari ini |
| GET | `/api/checkin/leaderboard?mode=points\|streak` | cookie | Top N + posisi sendiri |
| GET | `/api/internal/status/:customerId` | `INTERNAL_TOKEN` | Untuk `/home/checkin-card` backend CBN |
| POST | `/hooks/strapi` | `STRAPI_WEBHOOK_TOKEN` | Sinkron ulang konten Strapi |
| * | `/api/admin/*` | `ADMIN_TOKEN` | dashboard, rules, events (baca saja), cms/sync, logs, logs.csv |
| POST | `/dev/code` | – | Hanya dev (tanpa `CBN_EXCHANGE_URL`, bukan production) |

**Web app (`public/app.js`)**: `/app?mode=toast` · `/app?mode=page` · `/app?mode=page#rank` (peringkat; tombol back Android kembali ke misi) · `/admin` · `/demo`.

## Routing ke halaman app (`open_deeplink`)

Web app bisa mengarahkan user ke layar app CBN. Link diatur di Strapi:

| Di Strapi | Tampil di halaman check-in |
|---|---|
| Check-in Config → `loyalty_link` (default `cbn://cybro-loyalty`) | Tombol "Tukar poin di Cybro Loyalty ›" di kartu saldo |
| Check-in Event → `link` | Tombol "Lihat detail event ›" di kartu event |

Aturan link (dicek server di `cms.safeLink` saat sinkron):
- Boleh: `cbn://…` (deeplink app) dan `https://cbn.id/…` / `https://*.cbn.id/…`.
- Selain itu dihapus, dan muncul peringatan di Admin → Event & konten. Event-nya tetap jalan.
- Web mengirim `{ "type": "open_deeplink", "url": "cbn://tagihan" }`. Di browser biasa (tanpa app), link `https://` dibuka langsung, sedangkan `cbn://` diabaikan.

App **tetap wajib** mengecek ulang di sisi native. Jangan percaya URL dari WebView begitu saja:

```kotlin
// Android — dipanggil dari CbnBridge saat type == "open_deeplink" -aj
object Router {
    private val screens = mapOf(
        "tagihan" to TagihanActivity::class.java,
        "cybro-loyalty" to CybroLoyaltyActivity::class.java,
        "upgrade" to UpgradeActivity::class.java,
    )
    fun open(ctx: Context, url: String) {
        val uri = Uri.parse(url)
        when {
            uri.scheme == "cbn" -> screens[uri.host]?.let { ctx.startActivity(Intent(ctx, it).setData(uri)) }
            uri.scheme == "https" && (uri.host == "cbn.id" || uri.host?.endsWith(".cbn.id") == true) ->
                ctx.startActivity(Intent(ctx, InAppBrowserActivity::class.java).setData(uri))
            else -> Unit // tolak diam-diam -aj
        }
    }
}
```

```swift
// iOS — dipanggil dari userContentController saat type == "open_deeplink" -aj
enum Router {
    static func open(_ raw: String?, from nav: UINavigationController?) {
        guard let raw, let url = URL(string: raw), let host = url.host else { return }
        switch url.scheme {
        case "cbn":
            let screens: [String: () -> UIViewController] = [
                "tagihan": { TagihanViewController() },
                "cybro-loyalty": { CybroLoyaltyViewController() },
                "upgrade": { UpgradeViewController() },
            ]
            if let make = screens[host] { nav?.pushViewController(make(), animated: true) }
        case "https" where host == "cbn.id" || host.hasSuffix(".cbn.id"):
            nav?.present(SFSafariViewController(url: url), animated: true)
        default: break // tolak diam-diam -aj
        }
    }
}
```

Nama layar (`TagihanActivity`, `cybro-loyalty`, dst.) cuma contoh. Ganti sesuai daftar deeplink yang sudah ada di app CBN. Halaman penuh check-in sebaiknya ditutup dulu sebelum pindah layar.
