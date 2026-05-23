# プロジェクト文書

複数画面をまとめてレビューしたい場合は project document を使います。project document は
レビュー範囲の screen と template を明示的に列挙する `.vspec.project.md` です。

project document は、次の2つの workflow で使います。

- Project preview: `.vspec.project.md` を VS Code で開き、`MarkVSpec: Open Preview`
  を実行する。
- Document list export: `export document-list` で screen、template、参照 partial の
  compact な Markdown inventory を出力する。

## コピーできる例

リポジトリには project-level example があります。

- [Project Documents example](https://github.com/wamukat/markvspec/tree/main/examples/07-project-documents)

この directory には次が含まれます。

- `account-project.vspec.project.md`: project index。
- `screens/account-dashboard.vspec.md` と `screens/account-settings.vspec.md`:
  project に列挙される screen。
- `templates/account-shell.vspec.md`: project に列挙される template。
- `partials/account-summary.partial.vspec.md`: `references.partials` から到達する partial。

## プロジェクトをプレビューする

`account-project.vspec.project.md` を開き、次を実行します。

```text
MarkVSpec: Open Preview
```

Project preview には project title、notes、screen list、template list、transition
graph、transition table、project-level diagnostics が表示されます。

## 文書一覧を出力する

このリポジトリを checkout した状態で、次を実行します。

```bash
npx @markvspec/cli@latest export document-list examples/07-project-documents/account-project.vspec.project.md --out markvspec-docs
```

出力は `markvspec-docs/document-list.md` です。

## 関連ページ

- [プレビュー](../start/preview.md)
- [CLI](../reference/cli.md)
- [ファイル形式](../reference/file-format.md)

