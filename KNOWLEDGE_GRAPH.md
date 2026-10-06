# Knowledge Graph — Tebak Gambar

> Peta repo untuk Claude. Dibaca dulu sebelum explore; di-update setiap commit yang mengubah fakta di bawah
> (aturan: `.claude/skills/knowledge-graph/SKILL.md`). Referensi pakai nama simbol, bukan nomor baris.
> Last verified: 508c3cf

## Stack & commands
```
server/  Node ESM · Express 4 · better-sqlite3 (WAL, FK on) · socket.io · JWT (30d) · bcryptjs · multer
         npm run dev (node --watch) · npm start · npm run seed        port: PORT || 4000
client/  React + Vite + react-router · axios · socket.io-client · Capacitor 8 (@capacitor/browser)
         npm run dev · npm run build · npm run cap:sync · cap:open / cap:open:ios
tests/lint: TIDAK ADA (no test/lint script di kedua package) → verifikasi = build client + boot server
.claude/   skills: knowledge-graph · self-review · ajie-manta   Stop hook: hooks/verify.sh (node --check, vite build, graph-stale)
```

## Env vars
```
server  PORT · DB_PATH (default server/src/data/tebak-gambar.sqlite) · UPLOADS_DIR (default <dir DB_PATH>/uploads)
        JWT_SECRET (fallback 'dev-secret-change-me' ⚠ wajib di-set di prod; render.yaml generate)
        CLAIM_BASE_URL (default http://localhost:5173 → link /rewards/id/:token)
        RUSH_PRIZE_NAME · RUSH_PRIZE_AMOUNT · RUSH_DAILY_WINNERS
client  VITE_API_URL ('' di web → relative /api via Vite proxy; wajib di APK/iOS)
localStorage  tg_token (JWT, dipasang axios interceptor di api.js) · tg_intro (onboarding sekali)
```

## Data model (server/src/db.js — schema = CREATE TABLE IF NOT EXISTS, migrasi = ALTER manual)
```
users ─┬─< progress >── questions >── categories
       │     (solved, used_letter_hint, used_answer_key; UNIQUE user+question)
       ├─< submitted_questions   (status pending → review admin)
       ├─< spin_history >── roulette_prizes (type coin|diamond|voucher|none, weight, requires_claim, active)
       ├─< reward_claims          (token unik, status pending|claimed|expired, TTL 7 hari, form_data_json)
       └─< rush_runs              (question_ids_json, idx, started_ms, served_ms, status active|won|lost)
match_history (room_code, players_json, winner_username) — tanpa FK
users: coins(100) xp roulette_tickets avatar last_daily_claim rush_meter(ALTER, 0..5) is_admin
       ⚠ users.player_level = kolom mati; level selalu dihitung levelFromXp(xp)
questions: clues_json [{type,value}] · answer · level_number (urutan dalam kategori) · reward_coins/xp
Seed (data/seed.js, jalan saat import di index.js): kategori+soal bila categories kosong; user admin/admin123 ⚠
```

## API (server/src/index.js mount → routes/*) · A=requireAuth · ADM=requireAdmin
```
/api/health
/api/auth        POST /register · POST /login · GET /me(A)
/api/categories  GET /(A, +solvedCount, locked by levelFromXp) · POST/PUT/DELETE (ADM)
                 GET /:id/questions(A) → modeData(): letters+options, answer TIDAK dikirim
/api/questions   (ADM) POST / · POST /bulk · PUT/DELETE /:id · GET / · GET /submitted · POST /submitted/:id/review
                 POST /submit (A, user kirim soal)
/api/game        POST /questions/:id/answer(A) · POST /questions/:id/hint(A) {type: letter|answer}
/api/rewards     GET /daily/status · POST /daily/claim (+50 coin +20 xp) · GET /leaderboard (top 20 xp)
/api/roulette    GET /status · /prizes · POST /spin · GET /history · ADM: /admin/prizes CRUD · GET /admin/claims
/api/public/claims  GET /:token · POST /:token (tanpa auth; single-use; auto-expire saat dibaca)
/api/uploads     POST / (ADM, multer field 'image') → static /uploads
/api/rush        GET /status · POST /start · POST /:id/answer
Error handler global: 500 'Terjadi kesalahan pada server.' · pesan error user-facing = Bahasa Indonesia
```

## Economy rules (angka ada di kode, ubah di sini juga)
```
answer benar ─► +reward_coins, +reward_xp, +1 roulette_ticket, progress.solved=1
   pakai hint huruf (15 coin, reveal 30% huruf, 1x/soal) ─► coin ×0.7
   pakai kunci jawaban (40 coin) ─► coin 0, xp ×0.2
spin ─► −1 ticket · pickWeighted(active, weight>0) · coin tanpa claim = langsung · requires_claim ─► createClaim()
daily ─► tanggal UTC (toISOString)   ⚠ beda dengan Rush quota yang pakai WIB (+7h)
level ─► xpForLevel(N) = Σ(l−1)·50 untuk l=2..N (utils/leveling.js)
normalizeAnswer ─► UPPER, NFKD, non A-Z0-9 → spasi, collapse (utils/normalize.js) — dipakai semua pembanding jawaban
```

## Client map (client/src)
```
App.jsx  /login · /rewards/id/:token (ClaimPublic, publik) · /rush (Rush, di luar Layout)
         / (RequireAuth + Layout): index Home · category/:categoryId Game · roulette · multiplayer · multiplayer/:code
                                   kirim-soal SubmitQuestion · profile · admin (RequireAdmin → Admin.jsx tabs:
                                   categories|questions|bulk|submitted|roulette|claims)
context/ AuthContext (useAuth) · SocketContext (useSocket)   hooks/useToast   utils/openExternal (Capacitor Browser)
components/ QuestionCard · ClueEditor · RushTank · Toast · Layout
```

## Multiplayer (server/src/socket/multiplayer.js, state in-memory Map rooms — hilang saat restart)
```
client→server: room:create {categoryId} · room:join {code} · room:start · room:answer {answer} · room:leave · disconnect
server→room:   room:update · room:question · room:player_answered · room:round_end · room:game_over · room:error
5 ronde × 30s, jeda 3.5s, room dihapus 60s setelah game over → simpan ke match_history
```

## Design → code
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
```

## Rush Moment
```
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
```

## Deploy
```
Mobile deploy
├─ Android: client/android (Capacitor 8, appId com.tebakgambar.app)
├─ iOS:     client/ios (Capacitor 8, SPM)
└─ CI:      .github/workflows/mobile.yml
      android → debug APK artifact · ios → unsigned simulator .app artifact
      needs repo variable VITE_API_URL (deployed backend URL)

Backend deploy: render.yaml (Docker, SQLite on disk)
      ⚠ plan: free + disk — Render free instances don't support persistent disks
```

## Known gaps / risks (fakta, bukan TODO)
```
- ms/clean untuk isi tangki Rush dilaporkan client (bisa dipalsu) → uang dilindungi oleh timer server di /api/rush
- Rush /start: SELECT semua soal ORDER BY RANDOM() lalu filter di JS → lambat kalau bank soal ribuan
- Tidak ada test suite; tidak ada rate limit di /auth/login
- CORS origin * (express + socket.io), tanpa security headers (helmet), tanpa body size limit eksplisit
```
