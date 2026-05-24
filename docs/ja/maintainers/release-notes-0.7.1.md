# MarkVSpec 0.7.1 リリースノート

リリース日: 2026-05-24

## ハイライト

- `0.7.0` 後に見つかった source text diagnostics coverage の不足を埋める
  patch release です。
- Front Matter extension metadata の diagnostics 挙動を明示しました。
- generated/static design document の thematic break 表示を VS Code preview と
  揃えました。

## 追加

- `x-owner: team-a` のような unknown scalar top-level YAML Front Matter field に
  `frontMatter.representedExtension` info diagnostic を追加。
- public `frontMatter` metadata map に保持できない unknown non-scalar top-level
  YAML Front Matter field に `frontMatter.unsupportedExtension` warning diagnostic
  を追加。
- Front Matter unknown field、Layout / Slot metadata diagnostics、raw HTML prose
  block、thematic break の maintainer coverage documentation を追加。

## 変更

- prose 内の raw HTML block は represented source text として分類し、VS Code
  preview と generated/static document では escape 済み text として表示します。
- structured prose / free-form notes 内の thematic break は generated/static
  document でも `<hr class="note-break">` として表示し、VS Code preview と揃えました。

## 修正

- meaningful な unsupported author text に見える Layout / Slot metadata 行が黙って
  落ちないよう、`unrepresented-source-text` warning を出すようにしました。

## 互換性メモ

- `0.7.0` からの DSL syntax migration は不要です。
- package versions は root package、CLI、core、document renderer、exporter、
  docs site、VS Code extension で `0.7.1` に揃えています。
