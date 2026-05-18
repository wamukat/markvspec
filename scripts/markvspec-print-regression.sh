#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_OUT_DIR="$ROOT_DIR/.markvspec-regression"
OUT_DIR="${1:-$DEFAULT_OUT_DIR}"
HTML_DIR="$OUT_DIR/html"
PDF_DIR="$OUT_DIR/pdf"
LOG_FILE="$OUT_DIR/print-regression.log"

rm -rf "$OUT_DIR"
mkdir -p "$HTML_DIR" "$PDF_DIR"

run() {
  printf '$ %s\n' "$*" | tee -a "$LOG_FILE"
  "$@" 2>&1 | tee -a "$LOG_FILE"
}

cd "$ROOT_DIR"

run npm run build -w @markvspec/core
run npm run build -w @markvspec/exporter
run npm run bundle -w @markvspec/cli
run node packages/cli/dist/index.js validate "examples/**/*.vspec.md" --fail-on-warnings
run node packages/cli/dist/index.js export html "examples/**/*.vspec.md" --out "$HTML_DIR"

check_html_artifacts() {
  local missing=0
  local file
  while IFS= read -r file; do
    if ! grep -q 'State Views' "$file" && ! grep -q '状態ビュー' "$file"; then
      printf 'Missing State Views section in %s\n' "$file" | tee -a "$LOG_FILE"
      missing=1
    fi
    if ! grep -q 'class="doc-section state-screen-section"' "$file"; then
      printf 'Missing rendered state screen sections in %s\n' "$file" | tee -a "$LOG_FILE"
      missing=1
    fi
    if ! grep -q 'class="wireframe-section"' "$file"; then
      printf 'Missing rendered wireframe sections in %s\n' "$file" | tee -a "$LOG_FILE"
      missing=1
    fi
    if ! grep -q '@media print' "$file"; then
      printf 'Missing print stylesheet in %s\n' "$file" | tee -a "$LOG_FILE"
      missing=1
    fi
  done < <(find "$HTML_DIR" -type f -name '*.html' -size +0c | sort)
  return "$missing"
}

check_html_artifacts

printf '$ node packages/cli/dist/index.js export pdf examples/**/*.vspec.md --out %s\n' "$PDF_DIR" | tee -a "$LOG_FILE"
if node packages/cli/dist/index.js export pdf "examples/**/*.vspec.md" --out "$PDF_DIR" 2>&1 | tee -a "$LOG_FILE"; then
  find "$PDF_DIR" -type f -name '*.pdf' -size +0c | sort > "$OUT_DIR/pdf-files.txt"
else
  : > "$OUT_DIR/pdf-files.txt"
  if [[ "${MARKVSPEC_REQUIRE_PDF:-0}" == "1" ]]; then
    printf 'PDF export failed and MARKVSPEC_REQUIRE_PDF=1 is set.\n' | tee -a "$LOG_FILE"
    exit 1
  fi
  printf 'PDF export failed or no compatible browser was found; HTML artifacts remain available for browser print checks.\n' | tee -a "$LOG_FILE"
fi

find "$HTML_DIR" -type f -name '*.html' -size +0c | sort > "$OUT_DIR/html-files.txt"
printf 'Print regression artifacts written to %s\n' "$OUT_DIR" | tee -a "$LOG_FILE"
