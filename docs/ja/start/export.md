# 出力

MarkVSpec は `.vspec.md` から HTML / PDF を出力できます。複数画面を1つの成果物で
共有したい場合は、`.vspec.project.md` のプロジェクトファイルも出力できます。

## VS Code

VS Code のコマンドパレットから次のどちらかを実行します。

```text
MarkVSpec: Export Static HTML
MarkVSpec: Export PDF
```

![VS Code コマンドパレットで MarkVSpec の HTML / PDF 出力コマンドを表示している画面](../../assets/start/vscode-export-command.png)

初めて試す場合は、VS Code 拡張からの出力が一番簡単です。

CLI で出力したい場合の詳しいオプションは [CLI リファレンス](../reference/cli.md) を参照してください。

## HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

出力先には `hello.html` が作られます。レビューや共有用に、ソースと別の静的成果物として扱えます。

HTML 出力は、ブラウザで開ける軽い成果物が必要なときに使います。pull request にソースを置き、
レビュー用成果物として HTML を共有すると、Markdown を読まない人にも画面仕様を見せられます。

静的 HTML には、VS Code の外でレビューするために必要な構造化された仕様も含まれます。状態、レイアウト、要素、アクション、フォームグループ、ビジネスルール、バリデーション、エラーコード、独自のメモ、セクションや対象物の概要を確認できます。編集対象は生成 HTML ではなく、ソースの `.vspec.md` です。

プロジェクトファイルを HTML/PDF 出力すると、列挙された画面を読み込み、画面仕様を1つの
共有用出力にまとめます。プロジェクトプレビューとは役割が違います。プロジェクトプレビューはプロジェクト概要、
メモ、画面/テンプレート一覧、遷移図を確認する表示で、プロジェクト出力は
読み込んだ画面を共有用の成果物にまとめる出力です。

プロジェクトファイル内の画面、テンプレート、参照 partial を一覧で確認したい場合は、CLI の
`export document-list` を使います。詳しくは [CLI リファレンス](../reference/cli.md) を参照してください。

## PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF 出力には Chrome 互換ブラウザが必要です。環境にブラウザが見つからない場合は、HTML 出力を使って内容を確認してください。

PDF 出力は、issue、仕様レビュー、非エンジニア向け共有など、固定された見た目で渡したい場合に使います。
生成物はソースの代わりではありません。正本は `.vspec.md` のままにし、HTML / PDF は共有用成果物として扱います。

## 出力前に見ること

- プレビューで、主要な状態、要素、アクションが読めるか。
- プロジェクトファイルの場合は、出力前にプロジェクトプレビューで対象の画面、テンプレート、遷移図を確認する。
- レビューに必要な Form Groups、Business Rules、Validations、Error Codes、Notes が HTML 出力に出ているか。
- ソースが Git に残る場所に置かれているか。
- 共有先が編集する必要があるなら `.vspec.md`、読むだけなら HTML / PDF を渡す。
- 関連する画面群を1つの成果物にしたい場合は `.vspec.project.md` を使う。一覧だけなら `document-list` を使う。
- CLI で複数ファイルを出す場合は、出力先ディレクトリを明示する。

## 次

- [サンプル](../examples/index.md)
- [ガイド](../guide/index.md)
