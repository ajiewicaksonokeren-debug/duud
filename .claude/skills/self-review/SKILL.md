---
name: self-review
description: Review and fix your own change before reporting it — read the diff adversarially, run the repo's checks, fix every in-scope finding without asking, then report. Use after every code or config change, before saying the task is done.
---

# Self-review (auto-correct, then report)

The user reviews results; they do not ask for fixes. Every change goes through this loop before the final message.

## Loop
1. **Diff** — `git diff` (+ `git diff --cached`). Read every hunk as a hostile reviewer:
   - Does each line need to exist? Remove dead code, debug logs, unused imports, speculative options.
   - Already in the codebase? Reuse it (check KNOWLEDGE_GRAPH.md: `serializeUser`, `normalizeAnswer`, `createClaim`, `RUSH`, `useToast`, `api`…).
   - Correctness: null/missing rows, wrong status codes, unchecked `req.body`, admin routes missing `requireAdmin`, answer leaked to client, money/coin math, WIB vs UTC dates, race between check and update.
   - Contract: server response shape vs. the page that reads it (`client/src/pages/*`), socket event names on both sides.
   - Style: match surrounding code; error strings in Bahasa Indonesia.
2. **Checks** — the repo has no tests/lint, so:
   - Server: `node --check <changed .js>`; for route changes, boot (`cd server && npm ci && PORT=4999 DB_PATH=$SCRATCH/t.sqlite node src/index.js &`) and `curl` the changed endpoint, then kill it.
   - Client: `cd client && npm ci` (once per session) then `npx vite build`.
   - Behavior change → exercise it once (curl or the `run` skill), not only compile.
   - UI change → screenshot it with Playwright (Chromium at `/opt/pw-browsers`) at 360, 768 and 1440 px wide and look at every shot.
3. **Implicit requirements** — a senior would ship these without being told. Missing one = a finding:
   - UI/page: responsive 360→1440 with no horizontal scroll; touch targets ≥44px; readable text (≥14px body, contrast AA);
     loading, empty and error states; images sized (no layout shift) with alt text; keyboard focus visible; real links/buttons, not clickable divs;
     uses existing tokens in `client/src/styles.css`, no new one-off colors/fonts.
   - Landing page: plus `<title>` + meta description + OG tags, one clear CTA above the fold, fast first paint (no blocking heavy libs, lazy below-fold images).
   - API/route: validate `req.body`, correct auth middleware, 4xx with Indonesian message, no secrets/answers in responses.
   - Data: migration is idempotent (`IF NOT EXISTS` / column check like `rush_meter`), existing rows keep working.
   - Forms: disabled while submitting, no double submit, server-side validation too.
4. **Fix** everything found that is inside the task's scope. No permission needed. Repeat 1–3 until clean.
5. **Graph** — apply the `knowledge-graph` skill if any fact changed.
6. **Report** — only: what changed, what self-review caught and fixed, verification evidence (command + result), and anything left open.

## Ask first only when
- The fix is outside the requested scope or changes product behavior the user decided (prices, rewards, flows).
- It is destructive or outward-facing (deleting data, force-push, deploy, publishing).
Everything else: just fix it.

## Enforcement
`.claude/hooks/verify.sh` runs as a Stop hook: blocks finishing once if changed server files fail `node --check`, the client fails to build (or was changed but never built), or facts-bearing files changed without a graph update. Fix the cause; don't work around the hook.
