#!/bin/sh
# FailSafe Pre-Commit Guard — thin client querying commit-check endpoint
FAILSAFE_PORT="${FAILSAFE_PORT:-7777}"
TOKEN_FILE="$(git rev-parse --git-dir)/failsafe-hook-token"

if [ ! -f "$TOKEN_FILE" ]; then
  exit 0
fi

TOKEN=$(cat "$TOKEN_FILE")
response=$(curl -sf --max-time 2 \
  -H "X-FailSafe-Token: $TOKEN" \
  "http://127.0.0.1:${FAILSAFE_PORT}/api/v1/governance/commit-check" 2>/dev/null)

if [ $? -ne 0 ]; then
  exit 0
fi

allow=$(echo "$response" | grep -o '"allow"[[:space:]]*:[[:space:]]*true')
if [ -z "$allow" ]; then
  reason=$(echo "$response" | grep -o '"reason":"[^"]*"' | cut -d'"' -f4)
  echo "[FailSafe] Commit blocked: $reason"
  exit 1
fi

exit 0
