# Code (any language)

- Match the surrounding code: naming, file layout, error style, comment density. Repo conventions beat these defaults.
- No dead code, commented-out code, debug logs, unused imports/params, or speculative options/flags.
- Comments explain *why* only; never narrate obvious code. No TODO unless the user asked for one.
- Named constants for business numbers (prices, limits, timeouts) in one place, not magic numbers scattered.
- Functions do one thing; extract only when reused or when it removes real complexity — not for line count.
- Errors: handle at the boundary (route, job, UI); never swallow (`catch {}`), never `catch` just to re-throw the same thing.
- Validate external input once at the edge; trust typed/validated data inside.
- Pure logic separated from I/O so it can be tested without network/DB/clock.
- Prefer diffs/targeted edits over rewrites; don't reformat untouched lines.
- New dependency only when stdlib/platform/installed deps can't do it in ~20 lines; check last release <12 months, weekly downloads, size, license (MIT/Apache/BSD ok; GPL/AGPL ask first). Commit the lockfile.
- Config from env, validated at startup — crash fast with a clear message if required vars are missing.
