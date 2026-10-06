# Security (OWASP-level basics, always on)

- Secrets only from env/secret manager; never in repo, logs, client bundles or URLs. No insecure fallback (`|| 'dev-secret'`) in production — crash instead.
- `.env` gitignored; ship `.env.example` with names, no values.
- Passwords: bcrypt cost ≥10 or argon2id. Never return hashes.
- Sessions/JWT: access token ≤15 min + refresh token, or httpOnly `Secure` `SameSite=Lax` cookie. Long-lived (days) tokens only if the user accepts the risk.
- Rate limit auth endpoints (e.g. 5 attempts/min per IP + per account) and any endpoint that costs money or sends messages.
- SQL: parameterized queries only. HTML: framework escaping; never inject raw user HTML (`dangerouslySetInnerHTML`, `innerHTML`) without sanitizing.
- CORS: allowlist real origins; `*` only for truly public, cookie-less APIs.
- Uploads: allowlist MIME + extension, size limit, random server-side filename, never execute/serve as HTML.
- Security headers (e.g. `helmet` for Express): CSP, `X-Content-Type-Options`, `frame-ancestors`.
- Seed/default accounts (admin/admin123) never exist in production; first admin is created from env or a one-off command.
- Dependencies: run `npm audit --omit=dev` (or the ecosystem equivalent) before release; fix high/critical.
- Anything granting money or value: server decides; never trust client-reported scores, times or prices.
- Principle of least privilege for DB users, API keys, CI tokens.
