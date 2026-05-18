#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODE_BIN="${MARKVSPEC_CODE_BIN:-code}"
VERSION="$(node -e 'const fs = require("node:fs"); process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).version);' "$ROOT_DIR/package.json")"
VSIX_PATH="${MARKVSPEC_VSIX_PATH:-$ROOT_DIR/dist/markvspec-$VERSION.vsix}"
TARGET_FILE="${1:-$ROOT_DIR/examples/04-real-world-screens/login-basic.vspec.md}"
OUT_DIR="${MARKVSPEC_VSCODE_VSIX_SMOKE_DIR:-$ROOT_DIR/.work/vscode-vsix-smoke}"
RUN_DIR="$OUT_DIR/run-$(date +%Y%m%d-%H%M%S)"
USER_DATA_DIR="${MARKVSPEC_VSCODE_USER_DATA_DIR:-$RUN_DIR/user-data}"
EXTENSIONS_DIR="${MARKVSPEC_VSCODE_EXTENSIONS_DIR:-$RUN_DIR/extensions}"
DRIVER_DIR="$RUN_DIR/driver"
RESULT_FILE="$RUN_DIR/result.json"
INVALID_FILE="$RUN_DIR/broken-diagnostics.vspec.md"
LOG_FILE="$RUN_DIR/smoke.log"
LAUNCH_TIMEOUT_SECONDS="${MARKVSPEC_VSCODE_VSIX_SMOKE_TIMEOUT_SECONDS:-45}"

if ! command -v "$CODE_BIN" >/dev/null 2>&1; then
  echo "VS Code CLI not found: $CODE_BIN" >&2
  echo "Set MARKVSPEC_CODE_BIN to the VS Code CLI path." >&2
  exit 1
fi
if [ ! -f "$VSIX_PATH" ]; then
  echo "VSIX artifact not found: $VSIX_PATH" >&2
  echo "Run: npm run package:vsix -w packages/vscode-extension" >&2
  exit 1
fi
if [ ! -f "$TARGET_FILE" ]; then
  echo "Target MarkVSpec file not found: $TARGET_FILE" >&2
  exit 1
fi
if [ "$USER_DATA_DIR" = "$EXTENSIONS_DIR" ]; then
  echo "User data and extensions directories must be different." >&2
  exit 1
fi

mkdir -p "$RUN_DIR" "$USER_DATA_DIR" "$EXTENSIONS_DIR" "$DRIVER_DIR"
if find "$USER_DATA_DIR" -mindepth 1 -maxdepth 1 | grep -q .; then
  echo "User data directory is not empty: $USER_DATA_DIR" >&2
  echo "Use a fresh directory for packaged VSIX smoke runs." >&2
  exit 1
fi
if find "$EXTENSIONS_DIR" -mindepth 1 -maxdepth 1 | grep -q .; then
  echo "Extensions directory is not empty: $EXTENSIONS_DIR" >&2
  echo "Use a fresh directory for packaged VSIX smoke runs." >&2
  exit 1
fi

run() {
  printf '$' | tee -a "$LOG_FILE"
  printf ' %q' "$@" | tee -a "$LOG_FILE"
  printf '\n' | tee -a "$LOG_FILE"
  "$@" 2>&1 | tee -a "$LOG_FILE"
}

cat > "$DRIVER_DIR/package.json" <<'JSON'
{
  "name": "markvspec-vsix-smoke-driver",
  "version": "0.0.0",
  "private": true,
  "main": "./extension.js",
  "engines": {
    "vscode": "^1.100.0"
  },
  "activationEvents": [
    "onStartupFinished"
  ]
}
JSON

cat > "$DRIVER_DIR/extension.js" <<'JS'
const fs = require("node:fs/promises");
const vscode = require("vscode");

const requiredCommands = [
  "markvspec.openPreview",
  "markvspec.formatStructure",
  "markvspec.exportHtml",
  "markvspec.exportPdf",
  "markvspec.refreshPreview"
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDiagnostics(uri) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const diagnostics = vscode.languages.getDiagnostics(uri)
      .filter((diagnostic) => diagnostic.source === "MarkVSpec");
    if (diagnostics.length > 0) {
      return diagnostics;
    }
    await delay(250);
  }
  return [];
}

async function activate() {
  const checks = [];
  const resultPath = process.env.MARKVSPEC_VSIX_SMOKE_RESULT;
  const targetFile = process.env.MARKVSPEC_VSIX_SMOKE_TARGET;
  const invalidFile = process.env.MARKVSPEC_VSIX_SMOKE_INVALID;
  const expectedVersion = process.env.MARKVSPEC_VSIX_SMOKE_VERSION;
  const extensionId = "wamukat.markvspec";

  const check = (name, passed, detail = "") => {
    checks.push({ name, passed: Boolean(passed), detail: passed ? "" : detail });
    if (!passed) {
      throw new Error(detail ? `${name}: ${detail}` : name);
    }
  };

  try {
    const extension = vscode.extensions.getExtension(extensionId);
    check("extension is installed", extension, extensionId);
    check("extension version matches package", extension.packageJSON.version === expectedVersion, `${extension.packageJSON.version} !== ${expectedVersion}`);

    const targetUri = vscode.Uri.file(targetFile);
    const targetDocument = await vscode.workspace.openTextDocument(targetUri);
    await vscode.window.showTextDocument(targetDocument);
    await extension.activate();
    check("extension activates", extension.isActive);

    const commands = await vscode.commands.getCommands(true);
    for (const command of requiredCommands) {
      check(`command registered: ${command}`, commands.includes(command));
    }

    await vscode.commands.executeCommand("markvspec.openPreview", targetUri);
    check("preview command executes", true);

    const invalidUri = vscode.Uri.file(invalidFile);
    const invalidDocument = await vscode.workspace.openTextDocument(invalidUri);
    await vscode.window.showTextDocument(invalidDocument);
    const diagnostics = await waitForDiagnostics(invalidUri);
    check("diagnostics are published", diagnostics.length > 0, "expected at least one MarkVSpec diagnostic");

    await fs.writeFile(resultPath, JSON.stringify({ ok: true, checks }, null, 2));
  } catch (error) {
    checks.push({
      name: "smoke driver failed",
      passed: false,
      detail: error instanceof Error ? error.stack || error.message : String(error)
    });
    await fs.writeFile(resultPath, JSON.stringify({ ok: false, checks }, null, 2));
  } finally {
    await delay(250);
    await vscode.commands.executeCommand("workbench.action.closeWindow");
  }
}

module.exports = { activate };
JS

cat > "$INVALID_FILE" <<'MARKVSPEC'
---
id: SCR-BROKEN-SMOKE
title: Broken smoke input
route: /broken-smoke
---

## States

- idle*

## Layout: mobile

### L1:L-Main Stack

#### Items

- E-MissingElement
MARKVSPEC

echo "MarkVSpec packaged VSIX smoke" | tee -a "$LOG_FILE"
echo "VSIX: $VSIX_PATH" | tee -a "$LOG_FILE"
echo "Target: $TARGET_FILE" | tee -a "$LOG_FILE"
echo "Run dir: $RUN_DIR" | tee -a "$LOG_FILE"

run "$CODE_BIN" \
  --user-data-dir "$USER_DATA_DIR" \
  --extensions-dir "$EXTENSIONS_DIR" \
  --install-extension "$VSIX_PATH" \
  --force

run "$CODE_BIN" \
  --user-data-dir "$USER_DATA_DIR" \
  --extensions-dir "$EXTENSIONS_DIR" \
  --list-extensions \
  --show-versions

INSTALLED_DIR="$(find "$EXTENSIONS_DIR" -maxdepth 1 -type d -name 'wamukat.markvspec-*' | sort | tail -1)"
if [ -z "$INSTALLED_DIR" ] || [ ! -f "$INSTALLED_DIR/package.json" ]; then
  echo "Installed extension directory not found under $EXTENSIONS_DIR" | tee -a "$LOG_FILE"
  exit 1
fi

node - "$INSTALLED_DIR/package.json" "$VERSION" <<'NODE' | tee -a "$LOG_FILE"
const fs = require("node:fs");
const path = require("node:path");
const packagePath = process.argv[2];
const expectedVersion = process.argv[3];
const extensionRoot = path.dirname(packagePath);
const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
if (manifest.publisher !== "wamukat" || manifest.name !== "markvspec") {
  fail(`Unexpected extension id: ${manifest.publisher}.${manifest.name}`);
}
if (manifest.version !== expectedVersion) {
  fail(`Unexpected extension version: ${manifest.version} !== ${expectedVersion}`);
}
for (const file of [
  "dist/extension.js",
  "syntaxes/markvspec.tmLanguage.json",
  "language-configuration/markvspec.configuration.json",
  "snippets/markvspec.code-snippets",
  "media/mermaid.min.js"
]) {
  if (!fs.existsSync(path.join(extensionRoot, file))) {
    fail(`Installed extension is missing ${file}`);
  }
}
const commands = new Set((manifest.contributes?.commands ?? []).map((entry) => entry.command));
for (const command of [
  "markvspec.openPreview",
  "markvspec.formatStructure",
  "markvspec.exportHtml",
  "markvspec.exportPdf",
  "markvspec.refreshPreview"
]) {
  if (!commands.has(command)) {
    fail(`Installed extension manifest is missing command ${command}`);
  }
}
const extensions = new Set((manifest.contributes?.languages ?? []).flatMap((language) => language.extensions ?? []));
if (!extensions.has(".vspec.md") || !extensions.has(".vspec.project.md")) {
  fail("Installed extension manifest is missing MarkVSpec file extensions.");
}
console.log(`Installed extension manifest OK: ${manifest.publisher}.${manifest.name}@${manifest.version}`);
NODE

MARKVSPEC_VSIX_SMOKE_RESULT="$RESULT_FILE" \
MARKVSPEC_VSIX_SMOKE_TARGET="$TARGET_FILE" \
MARKVSPEC_VSIX_SMOKE_INVALID="$INVALID_FILE" \
MARKVSPEC_VSIX_SMOKE_VERSION="$VERSION" \
"$CODE_BIN" \
  --new-window \
  --wait \
  --skip-welcome \
  --disable-workspace-trust \
  --user-data-dir "$USER_DATA_DIR" \
  --extensions-dir "$EXTENSIONS_DIR" \
  --extensionDevelopmentPath "$DRIVER_DIR" \
  "$ROOT_DIR" >> "$LOG_FILE" 2>&1 &

CODE_PID=$!
DEADLINE=$((SECONDS + LAUNCH_TIMEOUT_SECONDS))
while kill -0 "$CODE_PID" >/dev/null 2>&1; do
  if [ "$SECONDS" -ge "$DEADLINE" ]; then
    echo "VS Code smoke driver timed out after ${LAUNCH_TIMEOUT_SECONDS}s." | tee -a "$LOG_FILE"
    pkill -f "$USER_DATA_DIR" >/dev/null 2>&1 || true
    wait "$CODE_PID" >/dev/null 2>&1 || true
    exit 1
  fi
  sleep 1
done
wait "$CODE_PID" || {
  status=$?
  echo "VS Code exited with status $status. See $LOG_FILE" | tee -a "$LOG_FILE"
  exit "$status"
}

if [ ! -f "$RESULT_FILE" ]; then
  echo "Smoke driver did not write result file: $RESULT_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

node - "$RESULT_FILE" <<'NODE' | tee -a "$LOG_FILE"
const fs = require("node:fs");
const result = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const check of result.checks ?? []) {
  const status = check.passed ? "PASS" : "FAIL";
  console.log(`${status} ${check.name}${check.detail ? ` - ${check.detail}` : ""}`);
}
if (!result.ok) {
  process.exit(1);
}
NODE

echo "Packaged VSIX smoke passed. Logs: $LOG_FILE"
