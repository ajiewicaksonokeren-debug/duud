#!/usr/bin/env bash
# Stop hook: blocks Claude from finishing while its changes fail checks. Exit 2 = stderr goes back to Claude.
cd "$(git rev-parse --show-toplevel)" || exit 0
# Second attempt after a block: let it stop, so a false positive can't loop forever.
grep -q '"stop_hook_active": *true' <<<"$(cat)" && exit 0

changed=$( { git status --porcelain | cut -c4-; git diff --name-only '@{u}..HEAD' 2>/dev/null; } | sort -u)
[ -z "$changed" ] && exit 0
errors=""

for f in $(grep -E '^server/.*\.js$' <<<"$changed"); do
  [ -f "$f" ] && { out=$(node --check "$f" 2>&1) || errors+="$f: $out"$'\n'; }
done

if grep -qE '^client/(src/|index\.html|vite\.config)' <<<"$changed"; then
  if [ -d client/node_modules ]; then
    out=$(cd client && npx vite build --logLevel error 2>&1) || errors+="client build failed:"$'\n'"$out"$'\n'
  else
    errors+="client/ changed but not built: run 'cd client && npm ci' then rebuild."$'\n'
  fi
fi

if grep -qE '^(server/src/(db\.js|index\.js|routes/|utils/|socket/)|client/src/App\.jsx|render\.yaml|\.github/)' <<<"$changed" \
   && ! grep -qx 'KNOWLEDGE_GRAPH.md' <<<"$changed"; then
  errors+="Facts-bearing files changed but KNOWLEDGE_GRAPH.md did not. Update it if any fact changed (skill: knowledge-graph)."$'\n'
fi

[ -z "$errors" ] && exit 0
printf 'Self-review check failed — fix before finishing:\n%s' "$errors" >&2
exit 2
