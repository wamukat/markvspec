# MarkVSpec 0.7.0 リリースノート

リリース日: 2026-05-24

## ハイライト

- section-based Action 記法を今回のリリース構文として整理しました。Action の
  process、case、note、移行 diagnostics、生成設計書、examples、Guide/Reference
  を新しい構造に揃えています。
- VS Code preview が source-aware になりました。preview block から source へ
  移動でき、source selection から preview の該当箇所を highlight / scroll でき、
  diagnostics の文脈表示、parse error 時の placeholder、last-known-good overlay、
  refresh 時の位置保持を扱います。
- project preview、document-list output、source metadata、comments、external
  inputs、framework-neutral な partial update の説明と examples を追加しました。
- Pages / docs-site の check は現在の CLI bundle を使って再生成し、ignored な
  generated docs-site content に依存しない clean checkout でも実行できます。

## 追加

- parser/model、renderer/export、migration diagnostics、docs、examples に
  section-based Action syntax support を追加。
- VS Code preview に source anchors、preview-to-source jump、source-to-preview
  highlight/scroll、diagnostics summary、affected block indicators を追加。
- parse-error placeholder、last-known-good preview overlay、scroll/focused source
  context の preview refresh retention を追加。
- source metadata、comments、external inputs、Front Matter、diagnostics、
  renderer/export output、example mappings の Reference coverage を追加。
- docs site に project preview と document-list examples を追加。

## 変更

- partial update documentation を framework-neutral にし、HTMX 専用に見える説明を
  修正。
- shared renderer/runtime、VS Code extension preview UI、docs-site dynamic preview
  の責務境界を maintainer docs に明記。
- Pages build で shared `build:example-export-tooling` を使い、example export 前に
  CLI を bundle するように変更。

## 修正

- Pages / example artifact generation で stale CLI bundle を使う問題を修正。
- example catalog validation 前に docs-site content を sync し、clean checkout の
  Pages build が通るように修正。
- parse / validation error と refresh state retention 周りの VS Code preview 挙動を
  修正。

## 互換性メモ

- Action authoring は section-based syntax に移行しています。既存 Action specs は
  Guide / Reference に記載された現在の `Triggered` / `Process` / case-oriented
  structure へ移行してください。
- package versions は root package、CLI、core、document renderer、exporter、
  docs site、VS Code extension で `0.7.0` に揃えています。
