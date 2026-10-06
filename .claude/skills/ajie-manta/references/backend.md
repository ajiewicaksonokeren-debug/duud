# Backend, API, jobs, integrations

## HTTP API
- Validate body/query/params (types, ranges, lengths); reject unknown enum values.
- Status codes: 200 ok · 201 created · 204 no body · 400 invalid · 401 no/invalid auth · 403 forbidden · 404 not found · 409 conflict/state · 413 too large · 422 semantic error (only if the repo already uses it) · 429 rate limited · 500 unexpected · 503 dependency down.
- Error body has one consistent shape (e.g. `{ error: "<message for the user>" }`); never leak stack traces, SQL, secrets, hashes or answers.
- Authorization checked per resource (does this user own this id?), not just "is logged in" — prevents IDOR.
- Lists paginated: default 20, max 100; cursor/keyset for large or fast-changing tables.
- Payments, rewards, anything that grants value: idempotent (idempotency key or unique constraint) so a retry can't pay twice.
- Body size limit (e.g. 100 KB JSON, explicit limit for uploads).
- Timestamps in responses: ISO 8601 UTC.

## Reliability
- Every outbound call has a timeout (default 10 s) — no infinite waits.
- Retry only idempotent calls: max 3, exponential backoff with jitter (e.g. 200 ms → 400 → 800 ± random).
- Work >1 s (email, image processing, reports) goes to a background job, not the request.
- `GET /health` returns 200 cheaply; handle `SIGTERM` → stop accepting, finish in-flight, close DB.

## Performance targets
- API p95 <300 ms for normal reads; no N+1 queries; select only needed columns.
- Cache only with an explicit TTL and invalidation story.
- gzip/brotli on responses; static assets with long cache + hashed filenames.

## Logging
- Structured (JSON) in prod, one line per request: method, path, status, ms, request id, user id.
- Never log passwords, tokens, full card/e-wallet numbers, OTPs, or personal data beyond an id.
