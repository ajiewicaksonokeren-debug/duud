---
name: knowledge-graph
description: Read and maintain KNOWLEDGE_GRAPH.md, the repo map of tables, API routes, economy numbers, socket events, env vars and design→code links. Use before exploring the codebase for any task, and after any change that alters those facts (new route, column, constant, page, env var, deploy setting).
---

# Knowledge graph

`KNOWLEDGE_GRAPH.md` at the repo root is the single map of this repo. It is auto-loaded via `CLAUDE.md`.

## Before work
1. Answer "where is X / how does Y work" from the graph first. Open only the files the graph points to.
2. Graph = index, not truth. Before editing, read the actual function you change; if it disagrees with the graph, the code wins and the graph gets fixed in the same commit.
3. If `Last verified` hash is far behind `git log -1`, run `git diff <hash>..HEAD --stat` and re-check only the touched areas.

## After work (same commit as the code change)
Update only the sections whose facts changed:

| Changed | Section |
|---|---|
| table/column/ALTER in `server/src/db.js` | Data model |
| `router.*` in `server/src/routes/*` or mount in `index.js` | API |
| reward/cost/limit constant | Economy rules or Rush Moment |
| page/route in `client/src/App.jsx` | Client map |
| socket event / timing | Multiplayer |
| `process.env.*` / `import.meta.env.*` / localStorage key | Env vars |
| Dockerfile, render.yaml, Capacitor, CI | Deploy |
| design file → page mapping | Design → code |
| discovered bug/risk not fixed | Known gaps / risks |

Then set `Last verified:` to the parent commit hash.

## Format rules
- Tree/arrow lines (`──►`, `├─`), one fact per line, no prose paragraphs.
- Name symbols (`createClaim()`, `RUSH.fastMs`), never line numbers — they rot.
- Write exact numbers (15 coin, 2000 ms), not "some cost".
- `⚠` marks a risk; "NOT implemented" marks a deliberate absence.
- Delete facts that are no longer true; never append "updated:" notes.

## Fast fact refresh (when unsure the graph is current)
```bash
grep -nE "router\.(get|post|put|patch|delete)\(" server/src/routes/*.js
grep -nE "CREATE TABLE|ALTER TABLE" server/src/db.js
grep -rhoE "process\.env\.[A-Z_]+|import\.meta\.env\.[A-Z_]+" server/src client/src | sort -u
grep -nE "<Route" client/src/App.jsx
grep -nE "socket\.on\(|emit\('" server/src/socket/multiplayer.js
```
