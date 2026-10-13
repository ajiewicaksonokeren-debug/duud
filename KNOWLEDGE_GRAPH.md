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

Rush Moment (cash prize) — all knobs in server/src/utils/rush.js (+ env RUSH_PRIZE_NAME/AMOUNT/DAILY_WINNERS)
├─ Tank (users.rush_meter, 0..5) ──► routes/game.js answer + hint
│     +1: correct, first try, no hint, no delete/paste, < 2s   (ms/clean reported by pages/Game.jsx)
│     → 0: wrong guess, hint, delete/paste · slow: unchanged · full tank is banked until used
│     UI: components/RushTank.jsx (Home, Game) · popup = CTA in MANTAP overlay when full
├─ Run ──► routes/rush.js (table rush_runs) · page: pages/Rush.jsx (route /rush, outside Layout)
│     start consumes tank · 10 random one-word answers ≤10 letters (from the level bank)
│     clue revealed one at a time · server times 2s/question + 15s total (+500ms network grace)
│     own A–Z keyboard: no delete key, no text field → no backspace/paste
├─ Quota: dailyWinners per WIB day, active runs reserve a slot
└─ Win ──► createClaim() in routes/roulette.js → reward_claims (type cash) → manual payout via admin Klaim
      ClaimPublic asks e-wallet number for cash claims

Mobile deploy
├─ Android: client/android (Capacitor 8, appId com.tebakgambar.app)
├─ iOS:     client/ios (Capacitor 8, SPM)
└─ CI:      .github/workflows/mobile.yml
      android → debug APK artifact · ios → unsigned simulator .app artifact
      needs repo variable VITE_API_URL (deployed backend URL)

Backend deploy: render.yaml (Docker, SQLite on disk)
      ⚠ plan: free + disk — Render free instances don't support persistent disks
```

# CBN Check-in Service (checkin/) — standalone, NOT part of Tebak Gambar

```
Design: Daily_Login_Gamification_System_1.zip (v2: all-WebView, no native UI; design said microCMS → we use Strapi)
Stack: Node 22 + Express 4 + better-sqlite3 + jsonwebtoken (session cookie), vanilla HTML/JS, no build · port 4100 · npm test
Language choice: stay JS/Node = same runtime as Strapi, one language for the team
├─ public/points.js ── pure rules, shared by server + admin simulator (single source of truth)
│     base 10 × streak mult (H1 ×1 · H7 ×1,2 · H14 ×1,5 · H30 ×2), Math.round
│     + level bonus round(base × pct) · Basic 0/0% · Silver 1.000/5% · Gold 5.000/10% · Platinum 15.000/20% (lifetime pts)
│     + 50 every streak%7==0 · milestones once per customer ever: 7:100 14:200 30:500 60:1.000 100:2.000
│     events: multiplier ×(base+lb) only (>1, ≤3) · time_window +N, end exclusive · challenge +N on Nth check-in in period
├─ src/cms.js ── Strapi sync (start, every 5 min, POST /hooks/strapi) → settings.cms_config + events table mirror
│     handles Strapi v4 (attributes) and v5 (flat) · relative media → STRAPI_URL prefix · failure keeps last mirror, retry 30 s
│     invalid / same-type overlapping events skipped (earlier start wins) → warnings in admin
│     config not published → enabled:false · segments = comma text, matched to exchange segments (empty = all)
├─ src/engine.js ── WIB = fixed UTC+7, day = WIB date, reset 00:00:00 WIB
│     claim(): transaction + UNIQUE(customer_id, day) → idempotent (409) · 403 when Strapi enabled=false
│     streak continues only if last_day == yesterday; broken → shows 0, next claim = 1; level never drops
│     balance = sum of last expiryMonths (12) · lifetime = all · leaderboard ties → earlier MAX(claimed_at)
│     showToast = enabled && popupEnabled && !claimed && not dismissed today
├─ src/index.js ── POST /api/session {code} → CBN_EXCHANGE_URL → cookie cbn_checkin (HttpOnly, SameSite=Lax, Secure in prod, 12 h)
│     customer_id only from exchange, never from browser · /dev/code (base64url JSON) only without CBN_EXCHANGE_URL and not prod
│     admin: Bearer ADMIN_TOKEN · GET /api/internal/status/:id (INTERNAL_TOKEN) · CSP script-src 'self' (no inline JS)
│     settings 'rules' = point rules + board.size (edited at /admin); content lives in Strapi
├─ public/app.html+app.js ── ?mode=toast (pop-up card, resize/open_full/close) | ?mode=page (misi, saldo, event, rincian, #rank, riwayat)
│     bridge: Android CBNBridge.postMessage(json) · iOS webkit.messageHandlers.cbn · demo iframe parent
│     msgs: resize, open_full, close, checkin_success{points,claimed_at}, haptic, session_expired
├─ public/admin.* ── Dashboard · Aturan Poin (+30-day sim) · Event & konten (read-only from Strapi, "Sinkron sekarang") · Log + CSV
├─ public/demo.* ── plays the CBN app: toast container + full container with app header
├─ strapi/src/api/{checkin-config,checkin-event} ── schema + core router/controller/service to copy into the Strapi project
└─ NOT built (needs CBN systems/business numbers): push notif, open_deeplink use, Streak Freeze / comeback bonus,
      admin roles · not tested against a real Strapi instance (mocked v4/v5 responses only)
      ⚠ SQLite = single instance only; multi-instance prod → Postgres
```
