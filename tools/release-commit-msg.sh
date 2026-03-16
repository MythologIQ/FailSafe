#!/usr/bin/env bash
# release-commit-msg.sh — commit-msg hook for [RELEASE] preflight gate
#
# Install: cp tools/release-commit-msg.sh .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg
#
# Blocks any commit whose message begins with "[RELEASE]" when release-gate
# preflight checks fail. Ensures documentation versioning is complete before
# a release commit lands.

MSG=$(cat "$1")

if [[ "$MSG" == \[RELEASE\]* ]]; then
  SCRIPT="FailSafe/extension/scripts/release-gate.cjs"

  if [ ! -f "$SCRIPT" ]; then
    # Graceful degradation — hook installed outside the extension workspace
    exit 0
  fi

  echo "[commit-msg] [RELEASE] commit detected — running release-gate preflight..."
  echo ""

  if ! node "$SCRIPT" --preflight; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "BLOCKED: Documentation versioning incomplete."
    echo "Fix all [FAIL] markers above, then retry the commit."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi

  echo ""
  echo "[commit-msg] Preflight PASSED — [RELEASE] commit allowed."
fi

exit 0
