#!/usr/bin/env bash
set -euo pipefail

if [ -z "${BOT_TOKEN:-}" ]; then
  echo "Error: BOT_TOKEN environment variable is not set" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

# Read APP_URL from wrangler.toml unless overridden by environment
if [ -z "${APP_URL:-}" ]; then
  APP_URL=$(grep 'APP_URL' "$ROOT_DIR/wrangler.toml" | sed 's/.*= *"\(.*\)"/\1/')
fi

API="https://api.telegram.org/bot${BOT_TOKEN}"

echo "==> Setting webhook to ${APP_URL}/telegram_bot"
curl -sf -X POST "$API/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${APP_URL}/telegram_bot\"}" | jq .

echo ""
echo "==> Setting bot commands"
COMMANDS="$(cat "$ROOT_DIR/bot-commands.json")"
curl -sf -X POST "$API/setMyCommands" \
  -H "Content-Type: application/json" \
  -d "{\"commands\": $COMMANDS}" | jq .

echo ""
echo "==> Setting menu button"
curl -sf -X POST "$API/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d "{\"menu_button\": {\"type\": \"web_app\", \"text\": \"Open App\", \"web_app\": {\"url\": \"${APP_URL}\"}}}" | jq .

echo ""
echo "Done."
