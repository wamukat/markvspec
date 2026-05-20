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

## PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF export には Chrome 互換ブラウザが必要です。環境にブラウザが見つからない場合は、HTML export を使って内容を確認してください。

## 次

- [Examples](../examples/index.md)
- [Guide](../guide/index.md)
