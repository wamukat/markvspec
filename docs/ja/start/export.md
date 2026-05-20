# Export

MarkVSpec は `.vspec.md` から HTML / PDF を出力できます。

## VS Code

Command Palette から次のどちらかを実行します。

```text
MarkVSpec: Export Static HTML
MarkVSpec: Export PDF
```

![VS Code Command Palette で MarkVSpec の HTML / PDF export command を表示している画面](../../assets/start/vscode-export-command.png)

初めて試す場合は、VS Code 拡張からの export が一番簡単です。

CLI で出力したい場合の詳しい option は [CLI reference](../reference/cli.md) を参照してください。

## HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

出力先には `hello-screen.html` が作られます。レビューや共有用に、source と別の静的成果物として扱えます。

HTML export は、ブラウザで開ける軽い成果物が必要なときに使います。pull request に source を置き、
レビュー用 artifact として HTML を共有すると、Markdown を読まない人にも画面仕様を見せられます。

## PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF export には Chrome 互換ブラウザが必要です。環境にブラウザが見つからない場合は、HTML export を使って内容を確認してください。

PDF export は、issue、仕様レビュー、非エンジニア向け共有など、固定された見た目で渡したい場合に使います。
生成物は source の代わりではありません。canonical source は `.vspec.md` のままにし、HTML / PDF は共有用 artifact として扱います。

## export 前に見ること

- preview で、主要な状態、要素、action が読めるか。
- source が Git に残る場所に置かれているか。
- 共有先が編集する必要があるなら `.vspec.md`、読むだけなら HTML / PDF を渡す。
- CLI で複数 file を出す場合は、出力先 directory を明示する。

## 次

- [Examples](../examples/index.md)
- [Guide](../guide/index.md)
