#!/usr/bin/env bash
# Run full FailSafe test suite (close VS Code first so better-sqlite3 can rebuild)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Compile ==="
npm run compile

echo ""
echo "=== Rebuild native modules ==="
npm run patch:better-sqlite3
npm run rebuild:vscode

echo ""
echo "=== Full VS Code test runner ==="
npm test

echo ""
echo "All tests complete."
