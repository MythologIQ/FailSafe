#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXT_DIR="$REPO_ROOT/extension"
WORKSPACE_ROOT="$(pwd)"
SKIP_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      WORKSPACE_ROOT="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ ! -d "$EXT_DIR" ]]; then
  echo "Extension folder not found at $EXT_DIR" >&2
  exit 1
fi

if ! command -v code >/dev/null 2>&1; then
  echo "VS Code CLI 'code' not found. Install VS Code and ensure 'code' is on PATH." >&2
  exit 1
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  pushd "$EXT_DIR" >/dev/null
  npm install
  npm run compile
  npm run patch:better-sqlite3
  npm run rebuild:vscode
  npm run package
  popd >/dev/null
fi

VSIX="$(ls -t "$EXT_DIR"/*.vsix 2>/dev/null | head -n 1)"
if [[ -z "$VSIX" ]]; then
  echo "No VSIX found in $EXT_DIR. Run without --skip-build to build one." >&2
  exit 1
fi

code --install-extension "$VSIX" --force

# Seed .failsafe/config if missing (do not overwrite)
CONFIG_SOURCE="$REPO_ROOT/qorelogic/VSCode/.failsafe/config"
CONFIG_TARGET="$WORKSPACE_ROOT/.failsafe/config"
if [[ -d "$CONFIG_SOURCE" && ! -d "$CONFIG_TARGET" ]]; then
  mkdir -p "$CONFIG_TARGET"
  cp -R "$CONFIG_SOURCE"/* "$CONFIG_TARGET"/
  echo "Seeded .failsafe/config in $WORKSPACE_ROOT"
elif [[ -d "$CONFIG_TARGET" ]]; then
  echo "Found existing .failsafe/config in $WORKSPACE_ROOT (left unchanged)"
fi

echo "Sentinel daemon installed via VS Code extension."
