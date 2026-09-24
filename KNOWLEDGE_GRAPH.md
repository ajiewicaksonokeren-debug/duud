# Knowledge Graph — Tebak Gambar

```
Design (Claude Design bundle)
├─ Tebak Gambar Brutalism.dc.html ──► client/src (mobile app, 480px)
│   ├─ tokens: ink #0d0d0d · paper #f5f2e8 · orange #ff4d00 · yellow #ffe000
│   │          Archivo Black (display) + Space Mono (label), border 3–4px, hard shadow, radius 0
│   │          ──► client/src/styles.css (:root vars; legacy class names kept → all pages reskinned)
│   ├─ Splash + Onboarding 3 slide + Login ──► pages/Login.jsx (intro once, localStorage tg_intro)
│   ├─ Home (hero, harian, roulette, metode, kategori) ──► pages/Home.jsx
│   │     └─ "Harian" tile = POST /api/rewards/daily/claim (no daily-question backend)
│   ├─ Pilih Level + Gameplay + MANTAP ──► pages/Game.jsx + components/QuestionCard.jsx
│   │     └─ 5 metode diundi per soal, never same twice ──► utils/modes.js
│   │           huruf/pg need data ──► server/src/routes/categories.js modeData()
│   │           (letters = answer + fillers shuffled, options = answer + 3 decoys; answer never sent)
│   ├─ Profil + Leaderboard + Riwayat klaim ──► pages/Profile.jsx
│   ├─ Roulette / Duel / Kirim Soal / Klaim ──► existing pages, reskinned via CSS only
│   └─ Admin (mobile) ──► pages/admin/*, reskinned via CSS only
├─ CMS Tebak Gambar.dc.html (desktop 1440) ──► NOT built yet (admin is reskin only)
└─ NOT implemented (no backend/SDK): Toko koin (IAP), iklan (AdMob), lencana, streak

Mobile deploy
├─ Android: client/android (Capacitor 8, appId com.tebakgambar.app)
├─ iOS:     client/ios (Capacitor 8, SPM)
└─ CI:      .github/workflows/mobile.yml
      android → debug APK artifact · ios → unsigned simulator .app artifact
      needs repo variable VITE_API_URL (deployed backend URL)

Backend deploy: render.yaml (Docker, SQLite on disk)
      ⚠ plan: free + disk — Render free instances don't support persistent disks
```
