---
title: "CLI"
---

CLI は、VS Code 拡張の外で source file を検証したり、review 用 artifact を export したいときに使います。

基本の流れは次のままです。

1. VS Code で `hello.vspec.md` を書く。
2. `MarkVSpec: Open Preview` で確認する。
3. 1画面を共有するだけなら VS Code から export する。
4. CI、script、複数 file の一括 export、project document list では CLI を使う。

自分の `.vspec.md` や `.vspec.project.md` に対して CLI を使うだけなら、この repository を clone する必要はありません。

## 書ける構文

### Validate

```bash
npx @markvspec/cli@latest validate hello.vspec.md
npx @markvspec/cli@latest validate "screens/**/*.vspec.md" --fail-on-warnings
```

source file を parse/validate し、構文上の不足や参照の問題を確認します。warning でも CI を
失敗させたい場合は `--fail-on-warnings` を付けます。

### Diagnose Input

```bash
npx @markvspec/cli@latest diagnose input requirements.md
```

AI に MarkVSpec source の作成や修正を依頼する前に、元になる企画文書の準備状況を
JSON report として出力します。report が `high-risk` の場合は non-zero exit になります。

### Export HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export html "screens/**/*.vspec.md" --out markvspec-html --messages markvspec.messages.yml
```

preview と共有に使える静的 HTML を出力します。

### Export PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
npx @markvspec/cli@latest export pdf "screens/**/*.vspec.md" --out markvspec-pdf --messages markvspec.messages.yml
```

PDF export には Chrome 互換ブラウザが必要です。

### Export Document List

```bash
npx @markvspec/cli@latest export document-list path/to/markvspec.project.md --out markvspec-docs
```

1つの project index file から `<out>/document-list.md` を生成します。入力は
`screens:` と任意の `templates:` を持つ `.vspec.project.md` です。任意 directory を
自動走査する command ではありません。

document list には次の行が含まれます。

- project file に列挙された screen の `Screen` 行。
- project file に列挙された template の `Template` 行。
- 宣言済み `references.partials` から到達できる partial の `Partial` 行。

出力 table の列は `No.`、`Kind`、`ID`、`Title`、`Summary`、`Route`、
`Last Updated`、`File`、`Diagnostics` です。`Diagnostics` は詳細本文ではなく、
`0 errors / 0 warnings` のような件数 summary です。

reviewer が screen / template / partial の一覧を確認したい場合は、この export を使います。
project intent、notes、document list、transition graph を一緒に読みたい場合は project preview を使います。
Project document の長い lead / notes prose は `document-list.md` には含めません。

## 小さな例

```bash
npx @markvspec/cli@latest validate hello.vspec.md --fail-on-warnings
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export document-list markvspec.project.md --out markvspec-docs
```

## 入力と出力

- `validate`、`export html`、`export pdf` は file、directory、glob を受け取ります。
- 入力を省略すると、current directory から `.vspec.md` / `.vspec.project.md` を探します。script では明示的な file や glob を指定してください。
- directory / glob の展開では `.git` と `node_modules` を除外します。
- `export html` は `<base>.html`、`export pdf` は `<base>.pdf` を出力します。
- `login.vspec.md` は `login.html` / `login.pdf` になります。
- `admin.vspec.project.md` は `admin.project.html` / `admin.project.pdf` になります。
- `vspec.project.md` は `vspec.project.html` / `vspec.project.pdf` になります。
- 複数 input が同じ出力名になる場合は、片方を上書きせず export を失敗させます。

## Renderer Messages

`export html` と `export pdf` は `--messages <path>` を受け取ります。export 画面の label を
locale や product に合わせたい場合に使います。

message file の解決順は次の通りです。

1. 明示した `--messages <path>`。
2. Front Matter の `messages: ./file.yml`。
3. source 近くの `markvspec.messages.<locale>.yml`、`.yaml`、`.json`、または `markvspec.messages.yml`、`.yaml`、`.json`。

Front Matter の `messages` は MarkVSpec file からの相対 path で、同じ directory の内側に
置く必要があります。message file が不正、または許可範囲外の場合は built-in label に戻し、
warning を出します。

## PDF 環境

PDF export は Chrome 互換ブラウザを headless で起動します。CLI は OS に応じて Chrome、
Edge、Brave、Chromium を探します。CI では先にどれかを入れてください。PDF export が
失敗する場合は、まず HTML export を確認してから、browser 固有の page break や font を
切り分けます。

## 注意点

- CLI は authoring source として JSON を要求しません。入力は `.vspec.md` または `.vspec.project.md` です。
- CI ではまず `validate` を実行し、成功した source だけを export します。
- `--out` は出力先 directory です。既存成果物の扱いは実行環境の運用に合わせて管理してください。
- `export document-list` は project index file を1つだけ受け取り、`<out>/document-list.md` を書き出します。
- VS Code extension から HTML/PDF を出力できる場合、個人作業では extension の export の方が簡単です。
- `examples/` 配下の path は MarkVSpec repository を checkout している前提です。自分の作業では、workspace 内の `.vspec.md` path を渡してください。

## 関連ページ

- [File Format](/markvspec/ja/reference/file-format/)
- [Sections](/markvspec/ja/reference/sections/)
- [Limitations](/markvspec/ja/reference/limitations/)
- [Hello Screen](/markvspec/examples/showcase/hello-screen.html)
