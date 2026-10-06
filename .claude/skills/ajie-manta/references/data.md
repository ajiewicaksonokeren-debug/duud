# Database, schema, money

- Migrations are idempotent and forward-only in prod (`IF NOT EXISTS`, check column before `ALTER`); existing rows must keep working (defaults for new NOT NULL columns).
- Run migrations before deploying code that needs them; destructive changes (drop/rename) in a later release after code stops using the old shape.
- Constraints live in the DB, not only in app code: `NOT NULL`, `UNIQUE`, foreign keys, `CHECK` for enums/ranges.
- Index every foreign key and every column used in frequent `WHERE`/`ORDER BY`/`JOIN`; verify with `EXPLAIN` on large tables.
- Multi-write operations in one transaction. Check-then-update for balances in one statement (`UPDATE … SET coins = coins - ? WHERE id = ? AND coins >= ?`) and check affected rows — avoids race conditions.
- Money: integers in the smallest unit (Rupiah has no subunit in practice → integer Rupiah; USD → cents). Never floats.
- Time: store UTC (ISO 8601 or epoch ms), convert at display. Day boundaries computed in the business timezone (WIB).
- `SELECT *` only in quick scripts; name columns in app code that crosses an API boundary.
- No unbounded queries: always `LIMIT` on user-facing lists; never `ORDER BY RANDOM()` on large tables (pick random ids instead).
- Personal data: store only what the feature needs; know where it lives so it can be deleted on request.
- Backups exist and a restore has been tested at least once before launch; SQLite on a server needs a persistent disk.
