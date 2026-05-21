---
title: "CLI"
---

CLI は、VS Code 拡張の外でソースファイルを検証したり、レビュー用の成果物を出力したいときに使います。

基本の流れは次のままです。

1. VS Code で `hello.vspec.md` を書く。
2. `MarkVSpec: Open Preview` で確認する。
3. 1画面を共有するだけなら VS Code から出力する。
4. CI、スクリプト、複数ファイルの一括出力、プロジェクト文書一覧では CLI を使う。

自分の `.vspec.md` や `.vspec.project.md` に対して CLI を使うだけなら、このリポジトリを clone する必要はありません。

## 書ける構文

### 検証

```bash
npx @markvspec/cli@latest validate hello.vspec.md
npx @markvspec/cli@latest validate "screens/**/*.vspec.md" --fail-on-warnings
```

ソースファイルを解析、検証し、構文上の不足や参照の問題を確認します。警告でも CI を
失敗させたい場合は `--fail-on-warnings` を付けます。

### 入力診断

```bash
npx @markvspec/cli@latest diagnose input requirements.md
```

AI に MarkVSpec ソースの作成や修正を依頼する前に、元になる企画文書の準備状況を
JSON レポートとして出力します。レポートが `high-risk` の場合は 0 以外の終了コードになります。

### HTML 出力

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export html "screens/**/*.vspec.md" --out markvspec-html --messages markvspec.messages.yml
```

プレビューと共有に使える静的 HTML を出力します。

### PDF 出力

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
npx @markvspec/cli@latest export pdf "screens/**/*.vspec.md" --out markvspec-pdf --messages markvspec.messages.yml
```

PDF 出力には Chrome 互換ブラウザが必要です。

### 文書一覧出力

```bash
npx @markvspec/cli@latest export document-list path/to/markvspec.project.md --out markvspec-docs
```

1つのプロジェクトインデックスファイルから `<out>/document-list.md` を生成します。入力は
`screens:` と任意の `templates:` を持つ `.vspec.project.md` です。任意のディレクトリを
自動走査するコマンドではありません。

文書一覧には次の行が含まれます。

- プロジェクトファイルに列挙された画面の `Screen` 行。
- プロジェクトファイルに列挙されたテンプレートの `Template` 行。
- 宣言済み `references.partials` から到達できる partial の `Partial` 行。

出力テーブルの列は `No.`、`Kind`、`ID`、`Title`、`Summary`、`Route`、
`Last Updated`、`File`、`Diagnostics` です。`Diagnostics` は詳細本文ではなく、
`0 errors / 0 warnings` のような件数要約です。

レビュー担当者が画面、テンプレート、partial の一覧を確認したい場合は、この出力を使います。
プロジェクトの意図、メモ、文書一覧、遷移図を一緒に読みたい場合はプロジェクトプレビューを使います。
プロジェクト文書の長い概要文やメモ本文は `document-list.md` には含めません。

## 小さな例

```bash
npx @markvspec/cli@latest validate hello.vspec.md --fail-on-warnings
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export document-list markvspec.project.md --out markvspec-docs
```

## 入力と出力

- `validate`、`export html`、`export pdf` はファイル、ディレクトリ、glob を受け取ります。
- 入力を省略すると、現在のディレクトリから `.vspec.md` / `.vspec.project.md` を探します。スクリプトでは明示的なファイルや glob を指定してください。
- ディレクトリ / glob の展開では `.git` と `node_modules` を除外します。
- `export html` は `<base>.html`、`export pdf` は `<base>.pdf` を出力します。
- `login.vspec.md` は `login.html` / `login.pdf` になります。
- `admin.vspec.project.md` は `admin.project.html` / `admin.project.pdf` になります。
- `vspec.project.md` は `vspec.project.html` / `vspec.project.pdf` になります。
- 複数の入力が同じ出力名になる場合は、片方を上書きせず出力を失敗させます。

## 表示メッセージ

`export html` と `export pdf` は `--messages <path>` を受け取ります。出力画面のラベルを
言語やプロダクトに合わせたい場合に使います。

メッセージファイルの解決順は次の通りです。

1. 明示した `--messages <path>`。
2. Front Matter の `messages: ./file.yml`。
3. ソース近くの `markvspec.messages.<locale>.yml`、`.yaml`、`.json`、または `markvspec.messages.yml`、`.yaml`、`.json`。

Front Matter の `messages` は MarkVSpec ファイルからの相対パスで、同じディレクトリの内側に
置く必要があります。メッセージファイルが不正、または許可範囲外の場合は組み込みラベルに戻し、
警告を出します。

## PDF 環境

PDF 出力は Chrome 互換ブラウザをヘッドレスで起動します。CLI は OS に応じて Chrome、
Edge、Brave、Chromium を探します。CI では先にどれかを入れてください。PDF 出力が
失敗する場合は、まず HTML 出力を確認してから、ブラウザ固有の改ページやフォントを
切り分けます。

## 注意点

- CLI は作成用ソースとして JSON を要求しません。入力は `.vspec.md` または `.vspec.project.md` です。
- CI ではまず `validate` を実行し、成功したソースだけを出力します。
- `--out` は出力先ディレクトリです。既存成果物の扱いは実行環境の運用に合わせて管理してください。
- `export document-list` はプロジェクトインデックスファイルを1つだけ受け取り、`<out>/document-list.md` を書き出します。
- VS Code 拡張から HTML/PDF を出力できる場合、個人作業では拡張の出力の方が簡単です。
- `examples/` 配下のパスは MarkVSpec リポジトリを checkout している前提です。自分の作業では、作業ディレクトリ内の `.vspec.md` パスを渡してください。

## 関連ページ

- [ファイル形式](/markvspec/ja/reference/file-format/)
- [セクション](/markvspec/ja/reference/sections/)
- [制限事項](/markvspec/ja/reference/limitations/)
- [Hello Screen](/markvspec/examples/showcase/hello-screen.html)
