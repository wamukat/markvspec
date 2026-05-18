#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODE_BIN="${MARKVSPEC_CODE_BIN:-code}"
PORT="${MARKVSPEC_VSCODE_DEBUG_PORT:-9336}"
USER_DATA_DIR="${MARKVSPEC_VSCODE_USER_DATA_DIR:-$(mktemp -d /tmp/markvspec-vscode-devhost-smoke.XXXXXX)}"
EXTENSIONS_DIR="${MARKVSPEC_VSCODE_EXTENSIONS_DIR:-$(mktemp -d /tmp/markvspec-vscode-devhost-smoke-extensions.XXXXXX)}"
TARGET_FILE="${1:-$ROOT_DIR/examples/04-real-world-screens/login-basic.vspec.md}"

if ! command -v "$CODE_BIN" >/dev/null 2>&1; then
  echo "VS Code CLI not found: $CODE_BIN" >&2
  echo "Set MARKVSPEC_CODE_BIN to the VS Code CLI path." >&2
  exit 1
fi

if pgrep -f "$USER_DATA_DIR" >/dev/null 2>&1; then
  echo "A VS Code smoke window is already using $USER_DATA_DIR." >&2
  echo "Close it before starting a new smoke run." >&2
  exit 1
fi
if [ "$USER_DATA_DIR" = "$EXTENSIONS_DIR" ]; then
  echo "User data and extensions directories must be different." >&2
  exit 1
fi

mkdir -p "$USER_DATA_DIR" "$EXTENSIONS_DIR"
if find "$USER_DATA_DIR" -mindepth 1 -maxdepth 1 | grep -q .; then
  echo "User data directory is not empty: $USER_DATA_DIR" >&2
  echo "Use a fresh directory for smoke runs to avoid modifying an existing VS Code profile." >&2
  exit 1
fi
if find "$EXTENSIONS_DIR" -mindepth 1 -maxdepth 1 | grep -q .; then
  echo "Extensions directory is not empty: $EXTENSIONS_DIR" >&2
  echo "Use a fresh directory for smoke runs to avoid mixing installed extensions into the result." >&2
  exit 1
fi

cat <<EOF
Starting MarkVSpec VS Code Extension Development Host.

Target: $TARGET_FILE
User data: $USER_DATA_DIR
Extensions: $EXTENSIONS_DIR
CDP port: $PORT

Close the Extension Development Host window normally when the smoke run is done.
Avoid killing the process with pkill/kill; VS Code records that as a crash.
EOF

"$CODE_BIN" \
  --new-window \
  --wait \
  --skip-welcome \
  --disable-workspace-trust \
  --user-data-dir "$USER_DATA_DIR" \
  --extensions-dir "$EXTENSIONS_DIR" \
  --remote-debugging-port="$PORT" \
  --extensionDevelopmentPath="$ROOT_DIR/packages/vscode-extension" \
  "$TARGET_FILE"

echo
echo "Smoke window closed. Logs are under:"
find "$USER_DATA_DIR/logs" -maxdepth 2 -type d 2>/dev/null | sort | tail -1 || true
