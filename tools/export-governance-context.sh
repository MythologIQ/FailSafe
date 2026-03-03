#!/bin/bash
# Exports governance context from committed artifacts for CI attachment
set -euo pipefail

OUTPUT_DIR="${1:-.failsafe-ci-context}"
mkdir -p "$OUTPUT_DIR"

# Export from version-controlled governance artifacts only
[ -f "docs/SYSTEM_STATE.md" ] && cp "docs/SYSTEM_STATE.md" "$OUTPUT_DIR/"
[ -f "CHANGELOG.md" ] && cp "CHANGELOG.md" "$OUTPUT_DIR/"

# Generate provenance summary from git log metadata
git log --format="%H %s" "$(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~10)..HEAD" \
  > "$OUTPUT_DIR/commit-summary.txt" 2>/dev/null || true

echo "Governance context exported to $OUTPUT_DIR"
