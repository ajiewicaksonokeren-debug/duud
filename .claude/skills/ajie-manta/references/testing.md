# Testing

- Test the behavior you changed; no tests unrelated to the change.
- Bug fix: write the failing test first, see it fail, then fix.
- Repo has no test runner → use the platform one before adding a dependency (`node --test`, `python -m unittest`, `go test`).
- Pure logic (prices, rewards, leveling, validation, date math) gets unit tests; routes get a few request-level tests for status codes + auth.
- Edge cases to always consider: empty, 0, negative, max/limit, duplicate submit, unicode/accented input, very long input, timezone boundary (00:00 WIB = 17:00 UTC previous day), concurrent requests on the same balance.
- Deterministic: inject clock and randomness; no real network; temp DB per test.
- Unit suite runs in <10 s; flaky test = bug to fix, never skip/disable to go green.
- UI: screenshot at the widths in `ui.md` and look at each; add e2e (Playwright) only for money/auth-critical flows.
