# Git, CI, deploy, ops, legal

## Git
- Small commits; message says *why*. Follow repo convention (Conventional Commits only if already used).
- Never commit secrets, `.env`, build output, local DBs, `node_modules`.
- Never force-push or rewrite shared history; never push to main without being asked.

## CI
- CI runs the same checks a contributor runs locally (lint, typecheck, test, build). Red CI = stop and fix, not retry.
- Pin runtime versions (`.nvmrc`/`engines`, lockfile committed).

## Deploy & release
- Every required env var documented (`.env.example` / deploy config) and validated at boot.
- Health check wired to the platform; zero-downtime where the platform supports it.
- Rollback plan known before deploy (previous image/commit + DB compatible).
- Risky features behind a flag or env toggle.
- Free tiers: check limits that break production (sleeping instances, no persistent disk, request caps) before choosing.

## Ops (before real users)
- Error monitoring (e.g. Sentry) on server and client; uptime check on `/health`.
- Logs retained and searchable; alerts for 5xx spikes and job failures.
- Backups scheduled and restore tested.

## Legal / store (Indonesia & app stores)
- Privacy policy URL required by Google Play and App Store when collecting personal data; account deletion path required for apps with sign-up.
- UU PDP (UU No. 27/2022) applies to personal data of Indonesians: purpose limitation, consent, deletion on request, breach notification.
- Cash prizes / gambling-like mechanics (roulette, loot boxes): check store policy and local law before launch — flag it, don't decide it.
