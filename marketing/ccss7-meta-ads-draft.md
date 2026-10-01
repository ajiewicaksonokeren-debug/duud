# Draft Meta Ads — CBN Championship Series Season 7 (CCSS7)

Status: **DRAFT — belum dibuat di Ads Manager, belum ada yang aktif.** Disusun 1 Okt 2026.
Legenda: ✅ terverifikasi · ⚠️ BELUM TERKONFIRMASI (wajib cek sebelum publish) · 🔧 keputusan teknis.

---

## 0. Temuan kritis (baca dulu)

| # | Temuan | Dampak | Status |
|---|---|---|---|
| 1 | **Minimum daily budget akun IDR = Rp17.825/ad set/hari** (dibaca dari API Meta pada semua akun IDR, termasuk *Cbn MarComm ADS* `420729605398411`). | **Rp6.250/ad set ditolak.** 8 ad set paralel butuh min. Rp142.600/hari. | ✅ |
| 2 | Dengan batas Rp50.000/hari, maksimum **2 ad set** bisa jalan bersamaan (2 × 17.825 = 35.650; 3 × 17.825 = 53.475 > 50.000). | Struktur wajib **bergiliran** → lihat §2. Budget tidak dinaikkan. | ✅ |
| 3 | File poster **tidak terlampir** di sesi ini. | Semua fakta materi hanya dari brief: nama event, 8 kota, `bit.ly/CCSS7`, "512 Teams", logo CBN Fiber/FiberStar/partner. Visual brief ditulis tanpa melihat poster. | ⚠️ kirim ulang poster |
| 4 | Redirect `bit.ly/CCSS7` tidak bisa dicek dari lingkungan ini (proxy 403). Tujuan akhir & terbawanya UTM belum diketahui. | Lihat §6. | ⚠️ |
| 5 | Nama game, jadwal, deadline, persyaratan peserta, venue, hadiah, biaya, status pendaftaran per kota **tidak ada di brief**. | Copy ditulis tanpa klaim tsb. Kalimat "pendaftaran dibuka" disediakan sebagai baris opsional terkunci. | ⚠️ |

Akun yang diasumsikan: **Cbn MarComm ADS (`420729605398411`, IDR, payment aktif)**. ⚠️ konfirmasi akun & Page/IG CBN yang dipakai.

---

## 1. Konfigurasi Campaign

| Field | Nilai |
|---|---|
| Nama | `CBN_CCSS7_Awareness_8Kota` |
| Buying type | Auction |
| Objective | Awareness (`OUTCOME_AWARENESS`) |
| Special ad category | Tidak ada |
| Advantage campaign budget | **OFF** (budget di ad set) |
| A/B test | OFF |
| Status saat dibuat | **PAUSED / draft — jangan Publish sebelum review** |

**Ad set (sama untuk semua 8):**

| Field | Nilai |
|---|---|
| Performance goal | Maximize reach of ads (`REACH`) |
| Frequency control | Cap manual **2 impresi / 7 hari** (cek default di UI, sesuaikan) |
| Billing | Impressions |
| Bid strategy | Highest volume (tanpa cap) |
| Budget | **Lifetime Rp43.750/ad set** (skema bergiliran §2) |
| Placement | Manual: Facebook Feed, Instagram Feed, Instagram Profile Feed, Instagram Explore, Facebook Stories, Instagram Stories. Reels **OFF** sampai ada aset video. Audience Network, Messenger, right column, search, in-stream **OFF**. |
| Audience | §3 |

---

## 2. Budget & Jadwal

### 2a. Kenapa rencana awal tidak bisa jalan
8 × Rp6.250 = Rp50.000/hari, tetapi tiap ad set wajib ≥ Rp17.825/hari. Ads Manager akan menolak saat Publish.

### 2b. Rekomendasi: 2 jalur bergiliran, lifetime budget (🔧 tetap Rp350.000, tetap 8 ad set)

- 7 hari × 2 slot paralel = 14 "ad-set-hari" ÷ 8 ad set = **1,75 hari (42 jam) per kota**.
- Tiap ad set: **lifetime Rp43.750**, flight 42 jam → rata-rata Rp25.000/hari (≥ minimum; walau dibulatkan 2 hari, min lifetime 2 × 17.825 = 35.650 tetap aman).
- Total: 8 × 43.750 = **Rp350.000** (di luar pajak). Paralel maksimal 2 × 25.000 = **Rp50.000/hari**.
- Lifetime budget dipilih karena Meta **tidak akan melewati total lifetime** per ad set, dan jam mulai/selesai bisa diset presisi — tidak perlu on/off manual.

**Aturan urutan:** urutkan kota dari **deadline pendaftaran paling awal**. Kota ke-1 → Jalur A slot 1, ke-2 → Jalur B slot 1, ke-3 → Jalur A slot 2, dst. Slot sebuah kota **harus selesai sebelum deadline kota itu**; kalau tidak, tukar slot. Kota yang pendaftarannya sudah tutup → keluarkan, realokasi ke kota lain (bukan tambah budget).

Template (D1 = tanggal mulai, ⚠️ tetapkan setelah jadwal kota terkonfirmasi; WIB):

| Slot | Waktu | Jalur A | Jalur B |
|---|---|---|---|
| 1 | D1 00:00 → D2 18:00 | Kota urutan deadline #1 | #2 |
| 2 | D2 18:00 → D4 12:00 | #3 | #4 |
| 3 | D4 12:00 → D6 06:00 | #5 | #6 |
| 4 | D6 06:00 → D8 00:00 | #7 | #8 |

Placeholder sampai deadline diketahui: A = AS01 Jakarta, AS03 Bandung, AS05 Yogyakarta, AS07 Malang; B = AS02 Sukabumi, AS04 Semarang, AS06 Surabaya, AS08 Cirebon.

### 2c. Alternatif B (kalau wajib daily budget)
Rp25.000/hari per ad set, 2 aktif bersamaan, on/off manual sesuai tabel di atas. Lebih berisiko (lupa switch = overspend jalur). Tidak direkomendasikan.

### 2d. Fakta soal daily budget
- **Daily budget = rata-rata, bukan plafon mutlak.** Meta boleh belanja hingga **75% di atas** daily budget pada hari tertentu, dengan jaminan total satu minggu kalender tidak melebihi 7 × daily budget.
- Lifetime budget: pengeluaran harian bisa naik-turun mengikuti peluang, tetapi **total tidak melebihi lifetime**.
- Pajak (PPN) ditagih di luar angka di atas.

### 2e. Kejujuran soal skala
Rp43.750 per kota selama 42 jam adalah tes kecil. Ekspektasikan delivery tidak stabil dan "Learning" tidak selesai — wajar untuk Reach di budget ini. Kalau tujuan bisnisnya awareness yang terasa di tiap kota, opsi yang perlu **persetujuan Anda** (tidak saya terapkan): (a) perpanjang ke 14 hari tetap Rp50.000/hari → 3,5 hari/kota, total Rp700.000; atau (b) fokus ke 4 kota dengan deadline terdekat dulu.

---

## 3. Target Audiens

### 3a. Dasar (semua ad set)
- Usia **18–34** ⚠️ sesuaikan ketentuan peserta (kalau ada peserta < 18, iklan tetap tidak menyasar < 18; arahkan via channel organik).
- Semua gender. Bahasa: tidak dibatasi.
- Minat (sebagai **saran**, bukan filter keras): *Esports*, *Video games*. **Tanpa** minat game spesifik sampai game terkonfirmasi ⚠️.

### 3b. Advantage+ audience — yang keras vs yang saran
| Pengaturan | Sifat |
|---|---|
| Lokasi | **Kontrol keras** — iklan tidak keluar dari lokasi |
| Usia minimum (set 18) | **Kontrol keras** |
| Rentang usia 18–34, gender, minat | **Hanya saran** — Meta boleh menayangkan ke usia > 34 / di luar minat bila prediksi lebih baik |

Kalau 18–34 harus mutlak → pakai *original audience options* dan matikan Advantage detailed targeting. Konsekuensi: audiens kota kecil (Sukabumi, Cirebon, Yogyakarta) bisa terlalu sempit → CPM naik & frequency cepat tinggi. Rekomendasi saya: Advantage+ audience, karena di Reach dengan budget kecil filter minat biasanya menaikkan biaya tanpa jaminan relevansi.

### 3c. Lokasi — kota ≠ kabupaten
Cara pilih: ketik nama, pilih entri bertipe **City** (bukan Region), cek poligon di peta, **tanpa radius** (radius kota di Meta minimum ±17 km → pasti tumpah ke kabupaten). Tipe lokasi: *People living in or recently in this location*.

| Ad set | Target | Jebakan yang harus dihindari | Fallback pin + radius (≈ setara luas, ⚠️ perkiraan) |
|---|---|---|---|
| AS01_Jakarta | Region **DKI Jakarta** (ikut Kep. Seribu, populasi kecil) | Jangan "Jakarta" yang hanya titik kota / jangan tambah radius (tumpah ke Bodetabek) | — |
| AS02_Sukabumi | **Kota Sukabumi** | Kabupaten Sukabumi jauh lebih luas | pusat kota, 4 km |
| AS03_Bandung | **Kota Bandung** | Kab. Bandung, Kab. Bandung Barat, Cimahi | alun-alun, 7 km |
| AS04_Semarang | **Kota Semarang** | Kab. Semarang (Ungaran) entitas berbeda | Simpang Lima, 10 km |
| AS05_Yogyakarta | **Kota Yogyakarta** | Region "Yogyakarta" = provinsi DIY (Sleman, Bantul, dll.) | Tugu, 3 km |
| AS06_Surabaya | **Kota Surabaya** | Sidoarjo, Gresik | pusat kota, 10 km |
| AS07_Malang | **Kota Malang** | Kab. Malang, Kota Batu | alun-alun, 6 km |
| AS08_Cirebon | **Kota Cirebon** | Kab. Cirebon mengelilingi kota | pusat kota, 3 km |

Pin radius minimum 1 km. Lingkaran tidak mengikuti batas administratif — fallback saja.

---

## 4. Tabel 8 Ad Set

| Ad set | Lokasi | Usia | Lifetime | Flight (placeholder) | Iklan |
|---|---|---|---|---|---|
| AS01_Jakarta | DKI Jakarta | 18–34 ⚠️ | Rp43.750 | A-1 | AD01_Jakarta_Static |
| AS02_Sukabumi | Kota Sukabumi | 18–34 ⚠️ | Rp43.750 | B-1 | AD02_Sukabumi_Static |
| AS03_Bandung | Kota Bandung | 18–34 ⚠️ | Rp43.750 | A-2 | AD03_Bandung_Static |
| AS04_Semarang | Kota Semarang | 18–34 ⚠️ | Rp43.750 | B-2 | AD04_Semarang_Static |
| AS05_Yogyakarta | Kota Yogyakarta | 18–34 ⚠️ | Rp43.750 | A-3 | AD05_Yogyakarta_Static |
| AS06_Surabaya | Kota Surabaya | 18–34 ⚠️ | Rp43.750 | B-3 | AD06_Surabaya_Static |
| AS07_Malang | Kota Malang | 18–34 ⚠️ | Rp43.750 | A-4 | AD07_Malang_Static |
| AS08_Cirebon | Kota Cirebon | 18–34 ⚠️ | Rp43.750 | B-4 | AD08_Cirebon_Static |
| **Total** | | | **Rp350.000** | | |

Tiap ad: 1 iklan, format single image dengan **placement asset customization** (4:5 untuk Feed/Explore, 9:16 untuk Stories).

---

## 5. Paket Copy (8 kota)

Aturan bersama:
- CTA: **Pelajari Selengkapnya** (`LEARN_MORE`).
- Tidak menyebut game, hadiah, venue, jadwal, biaya, kuota. "512 Teams" **tidak** dipakai di copy (rawan dibaca kuota kota).
- 🔒 **Baris opsional** — tambahkan di akhir primary text **hanya jika** status pendaftaran kota tsb sudah dikonfirmasi aktif & deadline belum lewat:
  `Pendaftaran [Kota] sudah dibuka — daftarkan timmu sebelum ditutup!`

| Ad | Primary text | Headline | Description |
|---|---|---|---|
| AD01 Jakarta | Jakarta, siapkan tim terbaikmu! 🎮 CBN Championship Series Season 7 (CCSS7) hadir di 8 kota, dan Jakarta masuk daftar. Kumpulin squad-mu, cek info lengkap untuk Jakarta di sini 👇 | Jakarta, Siapkan Tim Terbaikmu! | CCSS7 by CBN Fiber |
| AD02 Sukabumi | Sukabumi, waktunya unjuk skill! 🔥 CCSS7 — CBN Championship Series Season 7 — singgah di Kota Sukabumi. Ajak tim terbaikmu dan cek info kota Sukabumi sekarang 👇 | Sukabumi, Siapkan Tim Terbaikmu! | CCSS7 by CBN Fiber |
| AD03 Bandung | Bandung, siapkan tim terbaikmu! ⚡ CBN Championship Series Season 7 datang ke Kota Bandung. Satukan squad, latih strategi, dan cek info CCSS7 untuk Bandung di link ini 👇 | Bandung, Siapkan Tim Terbaikmu! | CCSS7 by CBN Fiber |
| AD04 Semarang | Semarang, siap naik level? 🎮 CCSS7 dari CBN hadir di Kota Semarang. Kumpulkan tim terbaikmu dan cek informasi event untuk Semarang di sini 👇 | Semarang, Siapkan Tim Terbaikmu! | CCSS7 by CBN Fiber |
| AD05 Yogyakarta | Jogja, panggil squad-mu! 🔥 CBN Championship Series Season 7 sampai di Kota Yogyakarta. Siapkan tim terbaik dan cek info CCSS7 untuk Jogja sekarang 👇 | Jogja, Siapkan Tim Terbaikmu! | CCSS7 by CBN Fiber |
| AD06 Surabaya | Surabaya, gaspol bareng tim! ⚡ CCSS7 — CBN Championship Series Season 7 — hadir di Kota Surabaya. Siapkan squad dan cek info lengkap untuk Surabaya di link ini 👇 | Surabaya, Siapkan Tim Terbaikmu! | CCSS7 by CBN Fiber |
| AD07 Malang | Malang, saatnya timmu tampil! 🎮 CBN Championship Series Season 7 datang ke Kota Malang. Kumpulin squad terbaik dan cek info CCSS7 untuk Malang di sini 👇 | Malang, Siapkan Tim Terbaikmu! | CCSS7 by CBN Fiber |
| AD08 Cirebon | Cirebon, siapkan tim terbaikmu! 🔥 CCSS7 dari CBN hadir di Kota Cirebon. Ajak squad-mu dan cek informasi event untuk Cirebon sekarang 👇 | Cirebon, Siapkan Tim Terbaikmu! | CCSS7 by CBN Fiber |

Catatan: headline ≤ 40 karakter (semua lolos). "Jogja" dipakai di copy karena lebih natural untuk komunitas lokal; ganti "Yogyakarta" kalau brand mewajibkan nama resmi.

---

## 6. URL & UTM

**URL dasar:** `https://bit.ly/CCSS7` ⚠️

Wajib dicek sebelum publish (buka di browser, lihat URL akhir di address bar):
1. Ke mana `bit.ly/CCSS7` berakhir (website / Google Form / linktree / lainnya)?
2. Apakah `?utm_...` yang ditempel ke bit.ly ikut sampai URL akhir?
3. Rekomendasi: **pakai URL akhir langsung** di iklan (hilangkan 1 hop redirect, pratinjau domain di iklan jadi jelas, risiko review lebih kecil). Pakai bit.ly hanya kalau URL akhir tidak tersedia.
4. Kalau tujuan akhir **Google Form**: UTM **tidak tercatat** di respons form. Atribusi pendaftar per kota hanya bisa lewat field "Kota" di form atau link form terpisah per kota.

**Website URL** di iklan = URL dasar. **URL parameters** (field terpisah di level ad):

```
utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign=ccss7_awareness_8kota&utm_content={{placement}}&utm_term=<kota>
```

| Ad | utm_term | URL lengkap (jika parameter ditempel manual) |
|---|---|---|
| AD01 | jakarta | `https://bit.ly/CCSS7?utm_source=meta&utm_medium=paid_social&utm_campaign=ccss7_awareness_8kota&utm_term=jakarta` |
| AD02 | sukabumi | `…&utm_term=sukabumi` |
| AD03 | bandung | `…&utm_term=bandung` |
| AD04 | semarang | `…&utm_term=semarang` |
| AD05 | yogyakarta | `…&utm_term=yogyakarta` |
| AD06 | surabaya | `…&utm_term=surabaya` |
| AD07 | malang | `…&utm_term=malang` |
| AD08 | cirebon | `…&utm_term=cirebon` |

`{{site_source_name}}` → fb/ig/msg/an; `{{placement}}` → mis. `Instagram_Stories`. Landing page views butuh Pixel/Dataset di URL akhir ⚠️ (kalau Google Form/bit.ly saja: tidak ada LPV).

---

## 7. Brief Adaptasi Visual

Sumber: poster CCSS7 ⚠️ (belum diterima — brief ini dikunci ke elemen yang disebut di brief saja).

**Prinsip:** satu master layout, 8 varian kota. Yang berubah hanya **nama kota**.

| Elemen | Aturan |
|---|---|
| Nama kota | Elemen terbesar kedua setelah logo CCSS7. Format: "BANDUNG, SIAPKAN TIM TERBAIKMU!" atau nama kota besar + tagline kecil. |
| Logo CCSS7 / nama event | Wajib terbaca di thumbnail. |
| CBN Fiber | Wajib, sesuai brand guideline (clear space, warna, tidak di-stretch/recolor) ⚠️ minta guideline. |
| FiberStar & partner | Pertahankan seperti di poster, urutan & ukuran sesuai ketentuan brand. |
| `bit.ly/CCSS7` | Boleh tetap di visual (konsisten dengan poster). |
| "512 Teams" | Jika dipertahankan, **jangan diletakkan bersebelahan dengan nama kota** (agar tidak terbaca sebagai kuota kota). Opsi aman: hapus dari varian iklan. |
| Larangan | Tidak menambah nama game, hadiah, tanggal, venue, biaya, kuota yang tidak ada di poster. Tidak memakai "Pendaftaran dibuka" di gambar (gambar tidak bisa diubah per status seperti copy). |
| Teks | Seminim mungkin; info detail di copy & landing page. |

**Spesifikasi:**

| Format | Ukuran | Safe area |
|---|---|---|
| Feed 4:5 | 1080 × 1350 px | margin ≥ 60 px tiap sisi untuk logo & teks. |
| Stories 9:16 | 1080 × 1920 px | Kosongkan teks/logo di **atas 270 px** dan **bawah 670 px**, sisi **65 px** (aman juga untuk Reels kalau nanti dipakai). Konten penting di area tengah 1080 × ~980 px. |
| Reels | — | Hanya jika ada aset video vertikal 9:16; belum ada → placement OFF. |

Format file: PNG/JPG sRGB, < 30 MB. Penamaan: `CCSS7_AS03_Bandung_Feed_1080x1350.png`, `CCSS7_AS03_Bandung_Story_1080x1920.png` (16 file total).

QA sebelum upload: cek pratinjau di Ads Manager untuk IG Stories & FB Stories (nama kota & logo tidak tertutup header profil / tombol CTA).

---

## 8. KPI & Evaluasi

**Utama:** Reach, Impressions, Frequency, CPM, Cost per 1.000 Accounts Center accounts reached, Amount spent per ad set.
**Tambahan:** Link clicks, Link CTR, Landing page views (⚠️ butuh pixel), Pendaftaran (⚠️ butuh tracking per kota).
Objective Awareness tidak dioptimasi untuk klik — CTR rendah adalah normal, bukan kegagalan.

### Simulasi (BUKAN janji)
Asumsi: cost per 1.000 reached Rp5.000–15.000 (rentang asumsi, belum ada benchmark akun); spend penuh Rp350.000; tanpa tumpang tindih antar kota.

| Skenario | Cost/1.000 reached | Reach total | Per kota (Rp43.750) |
|---|---|---|---|
| Optimis | Rp5.000 | ±70.000 | ±8.750 |
| Tengah | Rp10.000 | ±35.000 | ±4.375 |
| Pesimis | Rp15.000 | ±23.300 | ±2.900 |

Kota kecil bisa jenuh lebih cepat (frequency naik) dan kota besar bisa CPM lebih tinggi karena kompetisi lelang.

### Timeline
| Kapan | Cek | Aksi jika masalah |
|---|---|---|
| Sebelum D1 | Semua ⚠️ di dokumen ini tertutup; pratinjau 16 placement; URL akhir & UTM teruji | Tunda publish |
| Hari 1–2 | Approval, delivery mulai, spend sesuai pacing, lokasi (breakdown Region), tampilan, link | Iklan ditolak → revisi & submit ulang; tidak deliver → cek audiens terlalu sempit |
| Hari 3–4 | Cost/1.000 reached & frequency per kota yang sudah selesai | Frequency > 2,5 dalam slot 42 jam → longgarkan audiens (hapus saran minat) untuk kota berikutnya |
| Setiap hari | Deadline kota | Deadline lewat → pause ad set / hapus baris "pendaftaran dibuka" |
| Hari 7 | Laporan per kota (§9) + rekomendasi | — |

---

## 9. Template Laporan

| Ad set | Flight | Spend | Reach | Impr. | Freq. | CPM | Cost/1.000 reached | Link clicks | Link CTR | LPV | Pendaftar | Catatan |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AS01_Jakarta | | | | | | | | | | | | |
| AS02_Sukabumi | | | | | | | | | | | | |
| AS03_Bandung | | | | | | | | | | | | |
| AS04_Semarang | | | | | | | | | | | | |
| AS05_Yogyakarta | | | | | | | | | | | | |
| AS06_Surabaya | | | | | | | | | | | | |
| AS07_Malang | | | | | | | | | | | | |
| AS08_Cirebon | | | | | | | | | | | | |
| **Total** | | | | | | | | | | | | |

Ringkasan: kota paling efisien (cost/1.000 reached), kota jenuh (frequency), isu delivery/approval, rekomendasi lanjutan.

---

## 10. Rekomendasi Optimasi (dalam Rp50.000/hari)

1. **Jangan ubah iklan selama flight 42 jam** kecuali ditolak — setiap edit signifikan mereset learning dan memotong delivery di flight yang sudah pendek.
2. **Realokasi, bukan tambah:** kota yang deadline-nya lewat sebelum slotnya → keluarkan, lifetime-nya dipindah ke kota dengan cost/1.000 reached terbaik yang masih buka.
3. **Kota kecil jenuh** (frequency tinggi) → putaran berikutnya pakai audiens luas (lokasi + usia minimum saja).
4. **Putaran berikutnya** kalau ada data registrasi per kota: alihkan ke objective Traffic/Leads untuk kota dengan pendaftar terendah — Awareness tidak mengoptimasi pendaftaran.
5. Aset video 9:16 (5–15 detik) → aktifkan Reels; biasanya menambah inventori murah.

---

## 11. Checklist Sebelum Publish (semua harus ✅)

- [ ] Poster final diterima; visual 16 file selesai & lolos safe area
- [ ] Akun iklan, Page FB & akun IG CBN dikonfirmasi
- [ ] Nama game ⚠️ · jadwal & deadline per kota ⚠️ · persyaratan peserta (usia) ⚠️ · status pendaftaran per kota ⚠️
- [ ] URL akhir bit.ly & retensi UTM diuji; pixel di landing (opsional)
- [ ] Tanggal D1 ditetapkan; urutan slot disusun dari deadline
- [ ] Brand guideline CBN Fiber / FiberStar / partner dicek
- [ ] Campaign, 8 ad set, 8 ad dibuat dalam status **draft/paused** → review → baru Publish

---

## 12. Knowledge Graph

```
CCSS7 Meta Ads (draft, belum dibuat di Ads Manager)
├─ Akun: Cbn MarComm ADS 420729605398411 (IDR) ⚠️ konfirmasi
│   └─ min daily budget Rp17.825/ad set ──► Rp6.250 DITOLAK ──► 2 jalur bergiliran
├─ Campaign CBN_CCSS7_Awareness_8Kota · Awareness · CBO OFF
│   └─ 8 ad set · Maximize reach · lifetime Rp43.750 · flight 42 jam · total Rp350.000
│       ├─ urutan slot = deadline pendaftaran (⚠️ belum ada)
│       ├─ lokasi: City entry tanpa radius; DKI = region; Kota Yogyakarta ≠ DIY
│       └─ audiens: Advantage+ (keras: lokasi + usia min 18; saran: 18–34, esports, video games)
├─ Ad: 1/ad set · single image · 4:5 + 9:16 · CTA LEARN_MORE · Reels OFF
├─ Copy: hook "<Kota>, Siapkan Tim Terbaikmu!" · tanpa game/hadiah/kuota · baris "pendaftaran dibuka" terkunci
├─ URL: bit.ly/CCSS7 ⚠️ redirect & UTM belum teruji → pakai URL akhir
│   └─ utm_term=<kota> · utm_source={{site_source_name}} · utm_content={{placement}}
└─ Terbuka: poster, game, jadwal, deadline, syarat peserta, status per kota, brand guideline
```
