#!/usr/bin/env sh
# Share this project's Engram memories through the repo (.engram/).
#   export: write new memories of THIS project as chunks, scan them for
#           secrets, and stage them. Runs in the pre-commit hook.
#   import: load chunks pulled from the remote into the local Engram DB.
#           Runs in the post-merge and post-checkout hooks.
# Never fails a git operation because Engram is missing.
set -eu

PROJECT="onti-notes-reminders"
MODE="${1:-export}"

if ! command -v engram >/dev/null 2>&1; then
  echo "engram-sync: engram not installed, skipping $MODE"
  exit 0
fi

cd "$(git rev-parse --show-toplevel)"

if [ "$MODE" = "import" ]; then
  [ -d .engram ] || exit 0
  engram sync --import 2>&1 | grep -v -e "Update available" -e "brew " -e "To update" || true
  exit 0
fi

# Export only this project (never other projects' memories: the repo is public).
engram sync --project "$PROJECT" 2>&1 | grep -v -e "Update available" -e "brew " -e "To update" || true
[ -d .engram ] || exit 0

# Secret scan on new or changed chunks before they can be committed.
CHANGED=$(git ls-files --others --modified --exclude-standard .engram)
if [ -n "$CHANGED" ]; then
  PATTERN='sk=[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sb_secret_|service_role|SUPABASE_SERVICE|VAPID_PRIVATE|-----BEGIN [A-Z ]*PRIVATE KEY-----|postgres(ql)?://[^ ]*:[^ ]*@'
  for f in $CHANGED; do
    case "$f" in
      *.gz) CONTENT=$(gzip -dc "$f" 2>/dev/null || true) ;;
      *) CONTENT=$(cat "$f") ;;
    esac
    if printf '%s' "$CONTENT" | grep -Eq "$PATTERN"; then
      echo "engram-sync: possible secret in $f — not staged."
      echo "Remove the memory/prompt in Engram (engram delete <id>), delete the chunk, and retry."
      exit 1
    fi
  done
  git add .engram
fi
