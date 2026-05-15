# プロジェクト索引設計

## この文書の位置づけ

この文書は、複数画面を束ねる project index の将来設計です。現行リリースで画面仕様を書く場合は
[DSL リファレンス](../user/dsl.md) と [サンプルギャラリー](../user/example-gallery.md) を入口にしてください。

MarkVSpec は現在、単一画面ファイルを中心にしています。複数画面対応では、各画面ファイルの
読みやすさを損なわずに、画面検出、ファイル横断 validation、プロジェクト全体の
遷移図を作るための小さな project index を追加します。

## 将来候補フォーマット

将来候補では、project root に `vspec.project.md` を置く案を検討しています。
機械可読な project metadata は Front Matter に置き、人間向けの補足は Markdown として書く想定です。

```markdown
---
id: PRJ-ADMIN
type: project
title: Admin Console
screens:
  - id: SCR-USERS
    path: examples/04-real-world-screens/search-list.vspec.md
  - id: SCR-USER-DETAIL
    path: examples/03-actions/form-submit-flow.vspec.md
  - id: SCR-USER-EDIT
    path: examples/01-basics/login-basic.vspec.md
---

# PRJ-ADMIN Admin Console

## Notes

- User management screens are owned by the admin area.
```

project index がない場合、tooling は `**/*.vspec.md` による workspace discovery
へ fallback する案です。ただし dependency directory や build output は除外します。
明示的な index がある場合は、review 可能な順序を持てること、draft や実験ファイルを
除外できることを優先して、index を正とする想定です。

## 画面検出ルール

- index 内の path は project index file からの相対パス。
- index の `id` は対象 screen Front Matter の `id` と一致する必要がある。
- screen ID の重複は error。
- file が存在しない場合は error。
- 明示的な index があるとき、workspace に存在するが index にない file は information
  扱いに留める。

## 遷移グラフ要件

project graph は、Action transition の `navigate: SCR-*` から作ります。

各 edge には次を持たせます。

- source screen ID
- source action ID と marker
- action name
- source state
- result case
- target screen ID

外部 URL は screen ID と分けて扱います。`/path` や `https://...` への遷移は external
navigation edge であり、missing screen ではありません。

## ファイル横断 validation 範囲

将来実装の初期 validation は次に限定する案です。

- `navigate: SCR-*` が project index または discovery set 内の screen を参照している。
- project index の ID が target screen Front Matter ID と一致している。
- duplicate screen ID を project level で報告する。
- 同じ route を複数 screen が使っている場合は warning。ただし将来、明示的に許可できるようにする。

layout、element、action、state ID は初期段階では cross-file validation しません。
これらの ID は screen-local のままとします。

## 出力先

- VS Code command: project index preview を開く。
- プロジェクト遷移図: screen-to-screen navigation の Mermaid graph。
- プロジェクト診断: missing screen file、ID mismatch、duplicate screen ID、
  missing navigation target。
- Static HTML export: 各 screen document にリンクする project document。
