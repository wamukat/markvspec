---
title: "出力"
---

MarkVSpec は `.vspec.md` から HTML / PDF を出力できます。複数 screen を1つの成果物で
共有したい場合は、`.vspec.project.md` のプロジェクトファイルも出力できます。

## VS Code

Command Palette から次のどちらかを実行します。

```text
MarkVSpec: Export Static HTML
MarkVSpec: Export PDF
```

![VS Code Command Palette で MarkVSpec の HTML / PDF export command を表示している画面](../../assets/start/vscode-export-command.png)

初めて試す場合は、VS Code 拡張からの export が一番簡単です。

CLI で出力したい場合の詳しい option は [CLI reference](/markvspec/ja/reference/cli/) を参照してください。

## HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

出力先には `hello.html` が作られます。レビューや共有用に、source と別の静的成果物として扱えます。

HTML export は、ブラウザで開ける軽い成果物が必要なときに使います。pull request に source を置き、
レビュー用 artifact として HTML を共有すると、Markdown を読まない人にも画面仕様を見せられます。

Static HTML には、VS Code の外で review するために必要な structured specification も含まれます。states、layout、elements、actions、Form Groups、Business Rules、Validations、Error Codes、custom Notes、section / entity の lead や notes prose を確認できます。編集対象は生成 HTML ではなく、source の `.vspec.md` です。

プロジェクトファイルを HTML/PDF 出力すると、列挙された画面を読み込み、画面仕様を1つの
共有用出力にまとめます。プロジェクトプレビューとは役割が違います。プロジェクトプレビューはプロジェクト概要、
notes、screen/template list、transition graph を確認する表示で、project export は
読み込んだ screen を共有用の成果物にまとめる出力です。

プロジェクトファイル内の画面、テンプレート、参照 partial を一覧で確認したい場合は、CLI の
`export document-list` を使います。詳しくは [CLI reference](/markvspec/ja/reference/cli/) を参照してください。

## PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF export には Chrome 互換ブラウザが必要です。環境にブラウザが見つからない場合は、HTML export を使って内容を確認してください。

PDF export は、issue、仕様レビュー、非エンジニア向け共有など、固定された見た目で渡したい場合に使います。
生成物は source の代わりではありません。canonical source は `.vspec.md` のままにし、HTML / PDF は共有用 artifact として扱います。

## export 前に見ること

- プレビューで、主要な状態、要素、アクションが読めるか。
- プロジェクトファイルの場合は、出力前にプロジェクトプレビューで対象の画面、テンプレート、遷移図を確認する。
- review に必要な Form Groups、Business Rules、Validations、Error Codes、Notes が HTML output に出ているか。
- source が Git に残る場所に置かれているか。
- 共有先が編集する必要があるなら `.vspec.md`、読むだけなら HTML / PDF を渡す。
- 関連する screen 群を1つの成果物にしたい場合は `.vspec.project.md` を使う。一覧だけなら `document-list` を使う。
- CLI で複数ファイルを出す場合は、出力先ディレクトリを明示する。

## 次

- [サンプル](/markvspec/ja/examples/)
- [ガイド](/markvspec/ja/guide/)
